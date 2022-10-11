// Copyright (C) 2019-2022 Intel Corporation
// Copyright (C) 2022 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import PluginRegistry from './plugins';
import serverProxy from './server-proxy';
import logFactory, { Log } from './log';
import { LogType } from './enums';
import { ArgumentError } from './exceptions';

const WORKING_TIME_THRESHOLD = 100000; // ms, 1.66 min

function sleep(ms): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

interface IgnoreRule {
    lastLog: Log | null;
    timeThreshold?: number;
    ignore: (previousLog: Log, currentPayload: any) => boolean;
}

class LoggerStorage {
    public clientID: string;
    public lastLogTime: number;
    public workingTime: number;
    public collection: Array<Log>;
    public ignoreRules: Record<LogType.zoomImage | LogType.changeAttribute, IgnoreRule>;
    public isActiveChecker: (() => boolean) | null;
    public saving: boolean;

    constructor() {
        this.clientID = Date.now().toString().substr(-6);
        this.lastLogTime = Date.now();
        this.workingTime = 0;
        this.collection = [];
        this.isActiveChecker = null;
        this.saving = false;
        this.ignoreRules = {
            [LogType.zoomImage]: {
                lastLog: null,
                timeThreshold: 1000,
                ignore(previousLog: Log) {
                    return (Date.now() - previousLog.time.getTime()) < this.timeThreshold;
                },
            },
            [LogType.changeAttribute]: {
                lastLog: null,
                ignore(previousLog: Log, currentPayload: any) {
                    return (
                        currentPayload.object_id === previousLog.payload.object_id &&
                        currentPayload.id === previousLog.payload.id
                    );
                },
            },
        };
    }

    protected updateWorkingTime(): void {
        if (!this.isActiveChecker || this.isActiveChecker()) {
            const lastLogTime = Date.now();
            const diff = lastLogTime - this.lastLogTime;
            this.workingTime += diff < WORKING_TIME_THRESHOLD ? diff : 0;
            this.lastLogTime = lastLogTime;
        }
    }

    public async configure(isActiveChecker, activityHelper): Promise<void> {
        const result = await PluginRegistry.apiWrapper.call(
            this,
            LoggerStorage.prototype.configure,
            isActiveChecker,
            activityHelper,
        );
        return result;
    }

    public async log(logType: LogType, payload = {}, wait = false): Promise<Log> {
        const result = await PluginRegistry.apiWrapper.call(this, LoggerStorage.prototype.log, logType, payload, wait);
        return result;
    }

    public async save(): Promise<void> {
        const result = await PluginRegistry.apiWrapper.call(this, LoggerStorage.prototype.save);
        return result;
    }
}

Object.defineProperties(LoggerStorage.prototype.configure, {
    implementation: {
        writable: false,
        enumerable: false,
        value: async function implementation(isActiveChecker: () => boolean, userActivityCallback: Array<any>) {
            if (typeof isActiveChecker !== 'function') {
                throw new ArgumentError('isActiveChecker argument must be callable');
            }

            if (!Array.isArray(userActivityCallback)) {
                throw new ArgumentError('userActivityCallback argument must be an array');
            }

            this.isActiveChecker = () => !!isActiveChecker();
            userActivityCallback.push(this.updateWorkingTime.bind(this));
        },
    },
});

Object.defineProperties(LoggerStorage.prototype.log, {
    implementation: {
        writable: false,
        enumerable: false,
        value: async function implementation(logType: LogType, payload: any, wait: boolean) {
            if (typeof payload !== 'object') {
                throw new ArgumentError('Payload must be an object');
            }

            if (typeof wait !== 'boolean') {
                throw new ArgumentError('Wait must be boolean');
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

            const pushEvent = (): void => {
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
        },
    },
});

Object.defineProperties(LoggerStorage.prototype.save, {
    implementation: {
        writable: false,
        enumerable: false,
        value: async function implementation() {
            while (this.saving) {
                await sleep(100);
            }

            const collectionToSend = [...this.collection];
            const lastLog = this.collection[this.collection.length - 1];

            const logPayload: any = {
                client_id: this.clientID,
                working_time: this.workingTime,
            };

            if (this.isActiveChecker) {
                logPayload.is_active = this.isActiveChecker();
            }

            if (lastLog && lastLog.type === LogType.sendTaskInfo) {
                logPayload.job_id = lastLog.payload.job_id;
                logPayload.task_id = lastLog.payload.task_id;
            }

            const userActivityLog = logFactory(LogType.sendUserActivity, logPayload);
            collectionToSend.push(userActivityLog);

            try {
                this.saving = true;
                await serverProxy.logs.save(collectionToSend.map((log) => log.dump()));
                for (const rule of Object.values<IgnoreRule>(this.ignoreRules)) {
                    rule.lastLog = null;
                }
                this.collection = [];
                this.workingTime = 0;
                this.lastLogTime = Date.now();
            } finally {
                this.saving = false;
            }
        },
    },
});

export default new LoggerStorage();
