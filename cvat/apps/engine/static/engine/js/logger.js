/*
 * Copyright (C) 2018 Intel Corporation
 *
 * SPDX-License-Identifier: MIT
 */

/* exported Logger */

/* global
    Cookies:false
*/

"use strict";

class UserActivityHandler {
    constructor() {
        this._TIME_TRESHHOLD = 100000; //ms
        this._prevEventTime = Date.now();
        this._workingTime = 0;
    }

    updateTimer() {
        if (document.hasFocus()) {
            let now = Date.now();
            let diff = now - this._prevEventTime;
            this._prevEventTime = now;
            this._workingTime += diff < this._TIME_TRESHHOLD ? diff : 0;
        }
    }

    resetTimer() {
        this._prevEventTime = Date.now();
        this._workingTime = 0;
    }

    getWorkingTime() {
        return this._workingTime;
    }
}

class LogCollection extends Array {
    constructor(logger, items) {
        super(items.length);
        for (let i = 0; i < items.length; i++) {
            super[i] = items[i];
        }
        this._loggerHandler = logger;
    }

    save() {
        this._loggerHandler.pushLogs(this);
    }

    export() {
        return Array.from(this, log => log.serialize());
    }
}

class LoggerHandler {
    constructor(jobId) {
        this._clientID = Date.now().toString().substr(-6);
        this._jobId = jobId;
        this._logEvents = [];
        this._userActivityHandler = new UserActivityHandler();
        this._timeThresholds = {};
    }

    addEvent(event) {
        this._pushEvent(event);
    }

    addContinuedEvent(event) {
        this._userActivityHandler.updateTimer();
        event.onCloseCallback = this._closeCallback.bind(this);
        return event;
    }

    sendExceptions(exception) {
        this._extendEvent(exception);
        return new Promise((resolve, reject) => {
            let retries = 3;
            let makeRequest = () => {
                let xhr = new XMLHttpRequest();
                xhr.open('POST', '/api/v1/server/exception');
                xhr.setRequestHeader('Content-Type', 'application/json');
                xhr.setRequestHeader("X-CSRFToken", Cookies.get('csrftoken'));
                let onreject = () => {
                    if (retries--) {
                        setTimeout(() => makeRequest(), 30000); //30 sec delay
                    } else {
                        let payload = exception.serialize();
                        delete Object.assign(payload, {origin_message: payload.message }).message;
                        this.addEvent(new Logger.LogEvent(
                            Logger.EventType.sendException,
                            payload,
                            "Can't send exception",
                        ));
                        reject({
                            status: xhr.status,
                            statusText: xhr.statusText,
                        });
                    }
                };
                xhr.onload = () => {
                    switch (xhr.status) {
                        case 201:
                        case 403: // ignore forbidden response
                            resolve(xhr.response);
                            break;

                        default:
                            onreject();
                    }
                };
                xhr.onerror = () => {
                    //  if status === 0 a request is a failure on the network level, ignore it
                    if (xhr.status === 0) {
                        resolve(xhr.response);
                    } else {
                        onreject();
                    }
                };
                xhr.send(JSON.stringify(exception.serialize()));
            };
            makeRequest();
        });
    }

    getLogs() {
        let logs = new LogCollection(this, this._logEvents);
        this._logEvents.length = 0;
        return logs;
    }

    pushLogs(logEvents) {
        Array.prototype.push.apply(this._logEvents, logEvents);
    }

    _extendEvent(event) {
        event._jobId = this._jobId;
        event._clientId = this._clientID;
    }

    _pushEvent(event) {
        this._extendEvent(event);
        if (event._type in this._timeThresholds) {
            this._timeThresholds[event._type].wait(event);
        }
        else {
            this._logEvents.push(event);
        }
        this._userActivityHandler.updateTimer();
    }

    _closeCallback(event) {
        this._pushEvent(event);
    }

    updateTimer() {
        this._userActivityHandler.updateTimer();
    }

    resetTimer() {
        this._userActivityHandler.resetTimer();
    }

    getWorkingTime() {
        return this._userActivityHandler.getWorkingTime();
    }

    setTimeThreshold(eventType, threshold) {
        this._timeThresholds[eventType] = {
            _threshold: threshold,
            _timeoutHandler: null,
            _timestamp: 0,
            _event: null,
            _logEvents: this._logEvents,
            wait: function(event) {
                if (this._event) {
                    if (this._timeoutHandler) {
                        clearTimeout(this._timeoutHandler);
                    }
                }
                else {
                    this._timestamp = event._timestamp;
                }
                this._event = event;
                this._timeoutHandler = setTimeout(() => {
                    if ('duration' in this._event._values) {
                        this._event._values.duration += this._event._timestamp - this._timestamp;
                    }
                    this._event._timestamp = this._timestamp;
                    this._logEvents.push(this._event);
                    this._event = null;
                }, threshold);
            },
        };
    }
}


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

class LoggerEvent {
    constructor(type, message) {
        this._time = new Date().toISOString();
        this._clientId = null;
        this._jobId = null;
        this._type = type;
        this._message = message;
    }

    serialize() {
        let serializedObj = {
            job_id: this._jobId,
            client_id: this._clientId,
            name: Logger.eventTypeToString(this._type),
            time: this._time,
        };
        if (this._message) {
            Object.assign(serializedObj, { message: this._message,});
        }
        return serializedObj;
    }
}

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
    LogEvent: class extends LoggerEvent {
        constructor(type, values, message) {
            super(type, message);

            this._timestamp = Date.now();
            this.onCloseCallback = null;
            this._is_active = document.hasFocus();
            this._values = values || {};
        }

        serialize() {
            return Object.assign(super.serialize(), {
                payload: this._values,
                is_active: this._is_active,
            });
        };

        close(endTimestamp) {
            if (this.onCloseCallback) {
                this.addValues({
                    duration: endTimestamp ? endTimestamp - this._timestamp : Date.now() - this._timestamp,
                });
                this.onCloseCallback(this);
            }
        };

        addValues(values) {
            Object.assign(this._values, values);
        };
    },

    ExceptionEvent: class extends LoggerEvent {
        constructor(message, filename, line, column, stack, client, system) {
            super(Logger.EventType.sendException, message);

            this._client = client;
            this._column = column;
            this._filename = filename;
            this._line = line;
            this._stack = stack;
            this._system = system;
        }

        serialize() {
            return Object.assign(super.serialize(), {
                client: this._client,
                column: this._column,
                filename: this._filename,
                line: this._line,
                stack: this._stack,
                system: this._system,
            });
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
        // dumped as "Debug info". There are no additional required fields.
        debugInfo: 24,
        // dumped as "Fit image". There are no additional required fields.
        fitImage: 25,
        // dumped as "Rotate image". There are no additional required fields.
        rotateImage: 26,
    },

    /**
     * Logger.initializeLogger
     * @param {String} applicationName application name
     * @param {String} taskId Task identificator (i.e. link to Jira)
     * @param {String} serverURL server url to recive logs
     * @return {Bool} true if initialization was succeed
     * @static
     */
    initializeLogger: function(jobId) {
        if (!this._logger)
        {
            this._logger = new LoggerHandler(jobId);
            return true;
        }
        return false;
    },

    /**
     * Logger.addEvent Use this method to add a log event without duration field.
     * @param {Logger.EventType} type Event Type
     * @param {Object} values Any event values, for example {count: 1, label: 'vehicle'}
     * @param {String} message Any string message. Empty by default.
     * @static
     */
    addEvent: function(type, values, message='') {
        this._logger.addEvent(new Logger.LogEvent(type, values, message));
    },

    /**
     * Logger.addContinuedEvent Use to add log event with duration field.
     * Duration will be calculated automatically when LogEvent.close() method of
     * returned Object will be called. Note: in case of LogEvent.close() method
     * will not be callsed event will not be sent to server
     * @param {Logger.EventType} type Event Type
     * @param {Object} values Any event values, for example {count: 1, label:
     * 'vehicle'}
     * @param {String} message Any string message. Empty by default.
     * @return {LogEvent} instance of LogEvent
     * @static
     */
    addContinuedEvent: function(type, values, message='') {
        return this._logger.addContinuedEvent(new Logger.LogEvent(type, values, message));
    },

    /**
     * Logger.shortkeyLogDecorator use for decorating the shortkey handlers.
     * This decorator just create appropriate log event and close it when
     * decored function will performed.
     * @param {Function} decoredFunc is function for decorating
     * @return {Function} is decorated decoredFunc
     * @static
     */
    shortkeyLogDecorator: function(decoredFunc) {
        let self = this;
        return function(e, combo) {
            if (window.cvat.frozen) {
                return;
            }
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

    sendException: function(message, filename, line, column, stack, client, system) {
        return this._logger.sendExceptions(
            new Logger.ExceptionEvent(
                message,
                filename,
                line,
                column,
                stack,
                client,
                system
            )
        );
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
        case this.EventType.loadJob: return 'Load job';
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
        case this.EventType.debugInfo: return 'Debug info';
        case this.EventType.fitImage: return 'Fit image';
        case this.EventType.rotateImage: return 'Rotate image';
        default: return 'Unknown';
        }
    },
};
