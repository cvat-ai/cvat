/*
 * Copyright (C) 2018 Intel Corporation
 *
 * SPDX-License-Identifier: MIT
 */

/* exported Logger */
"use strict";

var UserActivityHandler = function()
{
    this._TIME_TRESHHOLD = 100000; //ms
    this._prevEventTime = Date.now();

    this._workingTime = 0;

    this.updateTimer = function()
    {
        let now = Date.now();
        let diff = now - this._prevEventTime;
        this._prevEventTime = now;
        this._workingTime += diff < this._TIME_TRESHHOLD ? diff : 0;
    };

    this.resetTimer = function()
    {
        this._prevEventTime = Date.now();
        this._workingTime = 0;
    };

    this.getWorkingTime = function()
    {
        return this._workingTime;
    };
};

class LogCollection extends Array {
    constructor(logger, items) {
        super(...items);
        this._loggerHandler = logger;
    }

    save() {
        this._loggerHandler.pushLogs(this);
    }

    export() {
        return Array.from(this, log => log.toString());
    }
}

var LoggerHandler = function(applicationName, jobId)
{
    this._application = applicationName;
    this._jobId = jobId;
    this._username = null;
    this._userActivityHandler = null;
    this._logEvents = [];
    this._userActivityHandler = new UserActivityHandler();
    this._timeThresholds = {};
    this.isInitialized = Boolean(this._userActivityHandler);

    this.addEvent = function(event)
    {
        this._pushEvent(event);
    };

    this.addContinuedEvent = function(event)
    {
        this._userActivityHandler.updateTimer();
        event.onCloseCallback = this._closeCallback;
        return event;
    };

    this.sendExceptions = function(exceptions)
    {
        for (let e of exceptions) {
            this._extendEvent(e);
        }

        return new Promise( (resolve, reject) => {
            let xhr = new XMLHttpRequest();
            xhr.open('POST', '/save/exception/' + this._jobId);
            xhr.setRequestHeader('Content-Type', 'application/json');
            xhr.setRequestHeader("X-CSRFToken", Cookies.get('csrftoken'));

            let onreject = () => {
                Array.prototype.push.apply(this._logEvents, exceptions);
                reject({
                    status: xhr.status,
                    statusText: xhr.statusText,
                });
            };

            xhr.onload = () => {
                if (xhr.status == 200)
                {
                    resolve(xhr.response);
                }
                else {
                    onreject();
                }
            };

            xhr.onerror = () => {
                onreject();
            };

            const data = {'exceptions': Array.from(exceptions, log => log.toString())};
            xhr.send(JSON.stringify(data));
        });
    };

    this.getLogs = function()
    {
        let logs = new LogCollection(this, this._logEvents);
        this._logEvents.length = 0;
        return logs;
    };

    this.pushLogs = function(logEvents)
    {
        Array.prototype.push.apply(this._logEvents, logEvents);
    };

    this._extendEvent = function(event)
    {
        event.addValues({
            application: this._application,
            task: this._jobId,
            userid: this._username,
        });
    };

    this._pushEvent = function(event)
    {
        this._extendEvent(event);

        if (event._type in this._timeThresholds) {
            this._timeThresholds[event._type].wait(event);
        }
        else {
            this._logEvents.push(event);
        }

        this._userActivityHandler.updateTimer();
    };

    this._closeCallback = event => { this._pushEvent(event); };

    this.setUsername = function(username)
    {
        this._username = username;
    };

    this.updateTimer = function()
    {
        this._userActivityHandler.updateTimer();
    };

    this.resetTimer = function()
    {
        this._userActivityHandler.resetTimer();
    };

    this.getWorkingTime = function()
    {
        return this._userActivityHandler.getWorkingTime();
    };

    this.setTimeThreshold = function(eventType, threshold)
    {
        this._timeThresholds[eventType] = {
            _threshold: threshold,
            _timeoutHandler: null,
            _timestamp: 0,
            _event: null,
            _logEvents: this._logEvents,
            wait: function(event) {
                if (this._event) {
                    if (this._timeoutHandler) clearTimeout(this._timeoutHandler);
                }
                else {
                    this._timestamp = event._timestamp;
                }

                this._event = event;

                this._timeoutHandler = setTimeout( () => {
                    if ('duration' in this._event._values) {
                        this._event._values.duration += this._event._timestamp - this._timestamp;
                    }

                    this._event._timestamp = this._timestamp;
                    this._logEvents.push(this._event);
                    this._event = null;
                }, threshold);
            },
        };
    };
};


/*
Log message has simple json format - each message is set of "key" : "value"
pairs inside curly braces - {"key1" : "string_value", "key2" : number_value,
...} Value may be string or number (see json spec) required fields for all event
types:

    NAME         TYPE           DESCRIPTION
"event"         string          see EventType enum description of possible values.
"timestamp"     number          timestamp in UNIX format - the number of seconds
                                or milliseconds that have elapsed since 00:00:00
                                Thursday, 1 January 1970
"application"   string          application name
"userid"        string          Unique userid
"task"          string          Unique task id. (Is expected corresponding Jira task id)

"count" is requiered field for "Add object", "Delete object", "Copy track",
"Propagate object", "Merge objecrs", "Undo action" and "Redo action" events with
number value.

Example : { "event" : "Add object", "timestamp" : 1486040342867, "application" :
"CVAT", "duration" : 4200, "userid" : "ESAZON1X-MOBL", "count" : 1, "type" :
"bounding box" }

Types of supported events. Minimum subset of events to generate simple report
are Logger.EventType.addObject, Logger.EventType.deleteObject and
Logger.EventType.sendTaskInfo. Value of "count" property should be a number.
*/

var Logger = {

    /**
     * @private
     */
    _logger: null,
    _userActivityHandler: null,

    /**
     * Logger.LogEvent class declaration
     * @param {Logger.EventType} type Type of event
     * @param {Object} values Any event values, for example {count: 1, label: 'vehicle'}
     * @param {Function} closeCallback callback function which will be called by close method. Setted by
     */
    LogEvent: function(type, values, closeCallback=null)
    {
        this._type = type;
        this._timestamp = Date.now();
        this.onCloseCallback = closeCallback;

        this._values = values || {};

        this.toString = function()
        {
            return Object.assign({
                event: Logger.eventTypeToString(this._type),
                timestamp: this._timestamp,
            }, this._values);
        };

        this.close = function(endTimestamp)
        {
            if (this.onCloseCallback)
            {
                this.addValues({
                    duration: endTimestamp ? endTimestamp - this._timestamp : Date.now() - this._timestamp,
                });
                this.onCloseCallback(this);
            }
        };

        this.addValues = function(values)
        {
            Object.assign(this._values, values);
        };
    },

    /**
     * Logger.EventType Enumeration.
     */
    EventType: {
        // dumped as "Paste object". There are no additional required fields.
        pasteObject: 0,
        // dumped as "Change attribute". There are no additional required
        // fields.
        changeAttribute: 1,
        // dumped as "Drag object". There are no additional required fields.
        dragObject: 2,
        // dumped as "Delete object". "count" is required field, value of
        // deleted objects should be positive number.
        deleteObject: 3,
        // dumped as "Press shortcut". There are no additional required fields.
        pressShortcut: 4,
        // dumped as "Resize object". There are no additional required fields.
        resizeObject: 5,
        // dumped as "Send logs". It's expected that event has "duration" field,
        // but it isn't necessary.
        sendLogs: 6,
        // dumped as "Save job". It's expected that event has "duration" field,
        // but it isn't necessary.
        saveJob: 7,
        // dumped as "Jump frame". There are no additional required fields.
        jumpFrame: 8,
        // dumped as "Draw object". It's expected that event has "duration"
        // field, but it isn't necessary.
        drawObject: 9,
        // dumped as "Change label".
        changeLabel: 10,
        // dumped as "Send task info". "track count", "frame count", "object
        // count" are required fields. It's expected that event has
        // "current_frame" field.
        sendTaskInfo: 11,
        // dumped as "Load job". "track count", "frame count", "object count"
        // are required fields. It's expected that event has "duration" field,
        // but it isn't necessary.
        loadJob: 12,
        // dumped as "Move image". It's expected that event has "duration"
        // field, but it isn't necessary.
        moveImage: 13,
        // dumped as "Zoom image". It's expected that event has "duration"
        // field, but it isn't necessary.
        zoomImage: 14,
        // dumped as "Lock object". There are no additional required fields.
        lockObject: 15,
        // dumped as "Merge objects". "count" is required field with positive or
        // negative number value.
        mergeObjects: 16,
        // dumped as "Copy object". "count" is required field with number value.
        copyObject: 17,
        // dumped as "Propagate object". "count" is required field with number
        // value.
        propagateObject: 18,
        // dumped as "Undo action". "count" is required field with positive or
        // negative number value.
        undoAction: 19,
        // dumped as "Redo action". "count" is required field with positive or
        // negative number value.
        redoAction: 20,
        // dumped as "Send user activity". "working_time" is required field with
        // positive number value.
        sendUserActivity: 21,
        // dumped as "Send exception". Use to send any exception events to the
        // server. "message", "filename", "line" are mandatory fields. "stack"
        // and "column" are optional.
        sendException: 22,
        // dumped as "Change frame". There are no additional required fields.
        changeFrame: 23,
    },

    /**
     * Logger.initializeLogger
     * @param {String} applicationName application name
     * @param {String} taskId Task identificator (i.e. link to Jira)
     * @param {String} serverURL server url to recive logs
     * @return {Bool} true if initialization was succeed
     * @static
     */
    initializeLogger: function(applicationName, taskId)
    {
        if (!this._logger)
        {
            this._logger = new LoggerHandler(applicationName, taskId);
            return this._logger.isInitialized;
        }
        return false;
    },

    /**
     * Logger.addEvent Use this method to add a log event without duration field.
     * @param {Logger.EventType} type Event Type
     * @param {Object} values Any event values, for example {count: 1, label: 'vehicle'}
     * @static
     */
    addEvent: function(type, values)
    {
        this._logger.addEvent(new Logger.LogEvent(type, values));
    },

    /**
     * Logger.addContinuedEvent Use to add log event with duration field.
     * Duration will be calculated automatically when LogEvent.close() method of
     * returned Object will be called. Note: in case of LogEvent.close() method
     * will not be callsed event will not be sent to server
     * @param {Logger.EventType} type Event Type
     * @param {Object} values Any event values, for example {count: 1, label:
     * 'vehicle'}
     * @return {LogEvent} instance of LogEvent
     * @static
     */
    addContinuedEvent: function(type, values)
    {
        return this._logger.addContinuedEvent(new Logger.LogEvent(type, values));
    },

    /**
     * Logger.shortkeyLogDecorator use for decorating the shortkey handlers.
     * This decorator just create appropriate log event and close it when
     * decored function will performed.
     * @param {Function} decoredFunc is function for decorating
     * @return {Function} is decorated decoredFunc
     * @static
     */
    shortkeyLogDecorator: function(decoredFunc)
    {
        let self = this;
        return function(e, combo) {
            let pressKeyEvent = self.addContinuedEvent(self.EventType.pressShortcut, {key:  combo});
            let returnValue = decoredFunc(e, combo);
            pressKeyEvent.close();
            return returnValue;
        };
    },

    /**
     * Logger.sendLogs Try to send exception logs to the server immediately.
     * @return {Promise}
     * @param {LogEvent} exceptionEvent
     * @static
     */
    sendException: function(exceptionData)
    {
        return this._logger.sendExceptions([new Logger.LogEvent(Logger.EventType.sendException, exceptionData)]);
    },

    /**
     * Logger.getLogs Remove and return collected Array of LogEvents from Logger
     * @return {Array}
     * @static
     */
    getLogs: function(appendUserActivity=true)
    {
        if (appendUserActivity)
        {
            this.addEvent(Logger.EventType.sendUserActivity, {'working time': this._logger.getWorkingTime()});
            this._logger.resetTimer();
        }

        return this._logger.getLogs();
    },

    /**
     * Logger.setUsername just set username property which will be added to all
     * log messages
     * @param {String} username
     * @static
     */
    setUsername: function(username)
    {
        this._logger.setUsername(username);
    },

    /** Logger.updateUserActivityTimer method updates internal timer for working
     * time calculation logic
     * @static
     */
    updateUserActivityTimer: function()
    {
        this._logger.updateTimer();
    },

    /** Logger.setTimeThreshold set time threshold in ms for EventType. If time
     * interval betwwen incoming log events less than threshold events will be
     * collapsed. Note that result event will have timestamp of first event, In
     * case of time threshold used for continued event duration will be
     * difference between first and last event timestamps and other fields from
     * last event.
     * @static
     * @param {Logger.EventType} eventType
     * @param {Number} threshold
     */
    setTimeThreshold: function(eventType, threshold=500)
    {
        this._logger.setTimeThreshold(eventType, threshold);
    },

    /** Logger._eventTypeToString private method to transform Logger.EventType
     * to string
     * @param {Logger.EventType} type Event Type
     * @return {String} string reppresentation of Logger.EventType
     * @static
     */
    eventTypeToString: function(type)
    {
        switch(type) {
        case this.EventType.pasteObject: return 'Paste object';
        case this.EventType.changeAttribute: return 'Change attribute';
        case this.EventType.dragObject: return 'Drag object';
        case this.EventType.deleteObject: return 'Delete object';
        case this.EventType.pressShortcut: return 'Press shortcut';
        case this.EventType.resizeObject: return 'Resize object';
        case this.EventType.sendLogs: return 'Send logs';
        case this.EventType.saveJob: return 'Save job';
        case this.EventType.jumpFrame: return 'Jump frame';
        case this.EventType.drawObject: return 'Draw object';
        case this.EventType.changeLabel: return 'Change label';
        case this.EventType.sendTaskInfo: return 'Send task info';
        case this.EventType.loadJob: return 'Load job'; // FIXME add track count, object count, fields
        case this.EventType.moveImage: return 'Move image';
        case this.EventType.zoomImage: return 'Zoom image';
        case this.EventType.lockObject: return 'Lock object';
        case this.EventType.mergeObjects: return 'Merge objects';
        case this.EventType.copyObject: return 'Copy object';
        case this.EventType.propagateObject: return 'Propagate object';
        case this.EventType.undoAction: return 'Undo action';
        case this.EventType.redoAction: return 'Redo action';
        case this.EventType.sendUserActivity: return 'Send user activity';
        case this.EventType.sendException: return 'Send exception';
        case this.EventType.changeFrame: return 'Change frame';
        default: return 'Unknown';
        }
    },
};
