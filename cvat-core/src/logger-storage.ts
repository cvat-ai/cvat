// Copyright (C) 2019-2022 Intel Corporation
// Copyright (C) 2022 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import PluginRegistry from './plugins';
import serverProxy from './server-proxy';
import logFactory, { EventLogger } from './log';
import { LogType } from './enums';
import { ArgumentError } from './exceptions';

function sleep(ms): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

interface IgnoreRule {
    lastLog: EventLogger | null;
    timeThreshold?: number;
    ignore: (previousLog: EventLogger, currentPayload: any) => boolean;
}

class LoggerStorage {
    public clientID: string;
    public collection: Array<EventLogger>;
    public ignoreRules: Record<LogType.zoomImage | LogType.changeAttribute, IgnoreRule>;
    public isActiveChecker: (() => boolean) | null;
    public saving: boolean;

    constructor() {
        this.clientID = Date.now().toString().substr(-6);
        this.collection = [];
        this.isActiveChecker = null;
        this.saving = false;
        this.ignoreRules = {
            [LogType.zoomImage]: {
                lastLog: null,
                timeThreshold: 1000,
                ignore(previousLog: EventLogger) {
                    return (Date.now() - previousLog.time.getTime()) < this.timeThreshold;
                },
            },
            [LogType.changeAttribute]: {
                lastLog: null,
                ignore(previousLog: EventLogger, currentPayload: any) {
                    return (
                        currentPayload.object_id === previousLog.payload.object_id &&
                        currentPayload.id === previousLog.payload.id
                    );
                },
            },
        };
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

    public async log(logType: LogType, payload = {}, wait = false): Promise<EventLogger> {
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
                log.validatePayload();
                log.onClose(null);
                this.collection.push(log);
            };

            if (log.scope === LogType.exception) {
                await serverProxy.events.save({
                    events: [log.dump()],
                    timestamp: new Date().toISOString(),
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
            if (!this.collection.length) {
                return;
            }

            while (this.saving) {
                await sleep(100);
            }

            const collectionToSend = [...this.collection];
            const logPayload: any = {
                client_id: this.clientID,
            };

            if (this.isActiveChecker) {
                logPayload.is_active = this.isActiveChecker();
            }

            try {
                this.saving = true;
                await serverProxy.events.save({
                    events: collectionToSend.map((log) => log.dump()),
                    timestamp: new Date().toISOString(),
                });
                for (const rule of Object.values<IgnoreRule>(this.ignoreRules)) {
                    rule.lastLog = null;
                }
                this.collection = [];
            } finally {
                this.saving = false;
            }
        },
    },
});

export default new LoggerStorage();
