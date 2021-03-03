// Copyright (C) 2019-2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

const serverProxy = require('./server-proxy');
const { ArgumentError } = require('./exceptions');
const { Task } = require('./session');
const MLModel = require('./ml-model');
const { RQStatus } = require('./enums');

class LambdaManager {
    constructor() {
        this.listening = {};
        this.cachedList = null;
    }

    async list() {
        if (Array.isArray(this.cachedList)) {
            return [...this.cachedList];
        }

        const result = await serverProxy.lambda.list();
        const models = [];

        for (const model of result) {
            models.push(
                new MLModel({
                    ...model,
                    type: model.kind,
                }),
            );
        }

        this.cachedList = models;
        return models;
    }

    async run(task, model, args) {
        if (!(task instanceof Task)) {
            throw new ArgumentError(
                `Argument task is expected to be an instance of Task class, but got ${typeof task}`,
            );
        }

        if (!(model instanceof MLModel)) {
            throw new ArgumentError(
                `Argument model is expected to be an instance of MLModel class, but got ${typeof model}`,
            );
        }

        if (args && typeof args !== 'object') {
            throw new ArgumentError(`Argument args is expected to be an object, but got ${typeof model}`);
        }

        const body = args;
        body.task = task.id;
        body.function = model.id;

        const result = await serverProxy.lambda.run(body);
        return result.id;
    }

    async call(task, model, args) {
        const body = args;
        body.task = task.id;
        const result = await serverProxy.lambda.call(model.id, body);
        return result;
    }

    async requests() {
        const result = await serverProxy.lambda.requests();
        return result.filter((request) => ['queued', 'started'].includes(request.status));
    }

    async cancel(requestID) {
        if (typeof requestID !== 'string') {
            throw new ArgumentError(`Request id argument is required to be a string. But got ${requestID}`);
        }

        if (this.listening[requestID]) {
            clearTimeout(this.listening[requestID].timeout);
            delete this.listening[requestID];
        }
        await serverProxy.lambda.cancel(requestID);
    }

    async listen(requestID, onUpdate) {
        const timeoutCallback = async () => {
            try {
                this.listening[requestID].timeout = null;
                const response = await serverProxy.lambda.status(requestID);

                if (response.status === RQStatus.QUEUED || response.status === RQStatus.STARTED) {
                    onUpdate(response.status, response.progress || 0);
                    this.listening[requestID].timeout = setTimeout(timeoutCallback, 2000);
                } else {
                    if (response.status === RQStatus.FINISHED) {
                        onUpdate(response.status, response.progress || 100);
                    } else {
                        onUpdate(response.status, response.progress || 0, response.exc_info || '');
                    }

                    delete this.listening[requestID];
                }
            } catch (error) {
                onUpdate(
                    RQStatus.UNKNOWN,
                    0,
                    `Could not get a status of the request ${requestID}. ${error.toString()}`,
                );
            }
        };

        this.listening[requestID] = {
            onUpdate,
            timeout: setTimeout(timeoutCallback, 2000),
        };
    }
}

module.exports = new LambdaManager();
