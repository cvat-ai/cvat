// Copyright (C) 2019-2022 Intel Corporation
// Copyright (C) 2022 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import serverProxy from './server-proxy';
import { ArgumentError } from './exceptions';
import MLModel from './ml-model';
import { RQStatus } from './enums';

class LambdaManager {
    private listening: any;
    private cachedList: any;

    constructor() {
        this.listening = {};
        this.cachedList = null;
    }

    async list(): Promise<MLModel[]> {
        if (Array.isArray(this.cachedList)) {
            return [...this.cachedList];
        }

        const lambdaFunctions = await serverProxy.lambda.list();
        const functions = await serverProxy.functions.list();
        const result = [...lambdaFunctions, ...functions];
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

    async run(taskID: number, model: MLModel, args: any) {
        if (!Number.isInteger(taskID) || taskID < 0) {
            throw new ArgumentError(`Argument taskID must be a positive integer. Got "${taskID}"`);
        }

        if (!(model instanceof MLModel)) {
            throw new ArgumentError(
                `Argument model is expected to be an instance of MLModel class, but got ${typeof model}`,
            );
        }

        if (args && typeof args !== 'object') {
            throw new ArgumentError(`Argument args is expected to be an object, but got ${typeof model}`);
        }

        const body = {
            ...args,
            task: taskID,
            function: model.id,
        };
        console.log('run');
        let result;
        if (model.provider === 'cvat') {
            result = await serverProxy.lambda.run(body);
        } else {
            result = await serverProxy.functions.run(body);
        }
        return result.id;
    }

    async call(taskID, model, args) {
        if (!Number.isInteger(taskID) || taskID < 0) {
            throw new ArgumentError(`Argument taskID must be a positive integer. Got "${taskID}"`);
        }

        const body = {
            ...args,
            task: taskID,
        };

        let result;
        console.log('call', model);
        if (model.provider === 'cvat') {
            result = await serverProxy.lambda.call(model.id, body);
        } else {
            result = await serverProxy.functions.call(model.id, body);
        }
        return result;
    }

    async requests() {
        // const lambdaRequests = await serverProxy.lambda.requests();
        const functionsRequests = await serverProxy.functions.requests();
        const result = [...functionsRequests];
        console.log(result);
        return result.filter((request) => ['queued', 'started'].includes(request.status));
    }

    async cancel(requestID): Promise<void> {
        if (typeof requestID !== 'string') {
            throw new ArgumentError(`Request id argument is required to be a string. But got ${requestID}`);
        }

        if (this.listening[requestID]) {
            clearTimeout(this.listening[requestID].timeout);
            delete this.listening[requestID];
        }
        await serverProxy.functions.cancel();
    }

    async listen(requestID, onUpdate): Promise<void> {
        const timeoutCallback = async (): Promise<void> => {
            try {
                this.listening[requestID].timeout = null;
                const response = await serverProxy.functions.status(requestID);

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

export default new LambdaManager();
