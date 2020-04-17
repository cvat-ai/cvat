// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

/* global
    require:false
*/

const PluginRegistry = require('./plugins');
const serverProxy = require('./server-proxy');
const logFactory = require('./log');
const { ArgumentError } = require('./exceptions');
const { LogType } = require('./enums');

const WORKING_TIME_THRESHOLD = 100000; // ms, 1.66 min

class LoggerStorage {
    constructor() {
        this.clientID = Date.now().toString().substr(-6);
        this.lastLogTime = Date.now();
        this.workingTime = 0;
        this.collection = [];
        this.ignoreRules = {}; // by event
        this.isActiveChecker = null;

        this.ignoreRules[LogType.zoomImage] = {
            lastLog: null,
            timeThreshold: 1000,
            ignore(previousLog) {
                return Date.now() - previousLog.time < this.timeThreshold;
            },
        };

        this.ignoreRules[LogType.changeAttribute] = {
            lastLog: null,
            ignore(previousLog, currentPayload) {
                return currentPayload.object_id === previousLog.payload.object_id
                    && currentPayload.id === previousLog.payload.id;
            },
        };
    }

    updateWorkingTime() {
        if (!this.isActiveChecker || this.isActiveChecker()) {
            const lastLogTime = Date.now();
            const diff = lastLogTime - this.lastLogTime;
            this.workingTime += diff < WORKING_TIME_THRESHOLD ? diff : 0;
            this.lastLogTime = lastLogTime;
        }
    }

    async configure(isActiveChecker, activityHelper) {
        const result = await PluginRegistry
            .apiWrapper.call(
                this, LoggerStorage.prototype.configure,
                isActiveChecker, activityHelper,
            );
        return result;
    }

    async log(logType, payload = {}, wait = false) {
        const result = await PluginRegistry
            .apiWrapper.call(this, LoggerStorage.prototype.log, logType, payload, wait);
        return result;
    }

    async save() {
        const result = await PluginRegistry
            .apiWrapper.call(this, LoggerStorage.prototype.save);
        return result;
    }
}

LoggerStorage.prototype.configure.implementation = function (
    isActiveChecker,
    userActivityCallback,
) {
    if (typeof (isActiveChecker) !== 'function') {
        throw new ArgumentError('isActiveChecker argument must be callable');
    }

    if (!Array.isArray(userActivityCallback)) {
        throw new ArgumentError('userActivityCallback argument must be an array');
    }

    this.isActiveChecker = () => !!isActiveChecker();
    userActivityCallback.push(this.updateWorkingTime.bind(this));
};

LoggerStorage.prototype.log.implementation = function (logType, payload, wait) {
    if (typeof (payload) !== 'object') {
        throw new ArgumentError('Payload must be an object');
    }

    if (typeof (wait) !== 'boolean') {
        throw new ArgumentError('Payload must be an object');
    }

    if (logType in this.ignoreRules) {
        const ignoreRule = this.ignoreRules[logType];
        const { lastLog } = ignoreRule;
        if (lastLog && ignoreRule.ignore(lastLog, payload)) {
            lastLog.payload = {
                ...lastLog.payload,
                ...payload,
            };

            this.updateWorkingTime();
            return ignoreRule.lastLog;
        }
    }

    const logPayload = { ...payload };
    logPayload.client_id = this.clientID;
    if (this.isActiveChecker) {
        logPayload.is_active = this.isActiveChecker();
    }

    const log = logFactory(logType, { ...logPayload });
    if (logType in this.ignoreRules) {
        this.ignoreRules[logType].lastLog = log;
    }

    const pushEvent = () => {
        this.updateWorkingTime();
        log.validatePayload();
        log.onClose(null);
        this.collection.push(log);
    };

    if (log.type === LogType.sendException) {
        serverProxy.server.exception(log.dump()).catch(() => {
            pushEvent();
        });

        return log;
    }

    if (wait) {
        log.onClose(pushEvent);
    } else {
        pushEvent();
    }

    return log;
};

LoggerStorage.prototype.save.implementation = async function () {
    const collectionToSend = [...this.collection];
    const lastLog = this.collection[this.collection.length - 1];

    const logPayload = {};
    logPayload.client_id = this.clientID;
    logPayload.working_time = this.workingTime;
    if (this.isActiveChecker) {
        logPayload.is_active = this.isActiveChecker();
    }

    if (lastLog && lastLog.type === LogType.sendTaskInfo) {
        logPayload.job_id = lastLog.payload.job_id;
        logPayload.task_id = lastLog.payload.task_id;
    }

    const userActivityLog = logFactory(LogType.sendUserActivity, logPayload);
    collectionToSend.push(userActivityLog);

    await serverProxy.logs.save(collectionToSend.map((log) => log.dump()));

    for (const rule of Object.values(this.ignoreRules)) {
        rule.lastLog = null;
    }
    this.collection = [];
    this.workingTime = 0;
    this.lastLogTime = Date.now();
};

module.exports = new LoggerStorage();
