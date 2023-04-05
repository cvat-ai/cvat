// Copyright (C) 2019-2022 Intel Corporation
// Copyright (C) 2022-2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import serverProxy from './server-proxy';
import { ArgumentError } from './exceptions';
import MLModel from './ml-model';
import { ModelProviders, RQStatus } from './enums';

export interface ModelProvider {
    name: string;
    icon: string;
    attributes: Record<string, string>;
}

export enum ModelRequestStatus {
    QUEUED = 'queued',
    STARTED = 'started',
}

export interface ModelProxy {
    run: (body: any) => Promise<any>;
    call: (modelID: string | number, body: any) => Promise<any>;
    status: (requestID: string) => Promise<any>;
    cancel: (requestID: string) => Promise<any>;
}

class LambdaManager {
    private listening: any;
    private cachedList: any;
    private proxyMap: Record<string, ModelProxy>

    constructor() {
        this.listening = {};
        this.proxyMap = {
            [ModelProviders.CVAT]: serverProxy.lambda,
        };
        this.cachedList = null;
    }

    async list(): Promise<{ models: MLModel[], count: number }> {
        const lambdaFunctions = await serverProxy.lambda.list();

        const models = [];
        for (const model of lambdaFunctions) {
            models.push(
                new MLModel({
                    ...model,
                }),
            );
        }

        this.updateModelList(models);
        return { models, count: lambdaFunctions.length };
    }

    updateModelList(models: MLModel[] = []): void {
        this.cachedList = models;
    }

    setModelProxyMap(proxyMap: Record<string, ModelProxy>): void {
        this.proxyMap = {
            ...proxyMap,
            [ModelProviders.CVAT]: serverProxy.lambda,
        };
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

        const result = await this.modelProxy(model)?.run(body);
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
        const result = await this.modelProxy(model)?.call(model.id, body);
        return result;
    }

    async requests() {
        const lambdaRequests = await serverProxy.lambda.requests();
        return lambdaRequests
            .filter((request) => [ModelRequestStatus.QUEUED, ModelRequestStatus.STARTED].includes(request.status));
    }

    async cancel(requestID, functionID): Promise<void> {
        if (typeof requestID !== 'string') {
            throw new ArgumentError(`Request id argument is required to be a string. But got ${requestID}`);
        }
        const model = this.cachedList.find((_model) => _model.id === functionID);
        if (!model) {
            throw new ArgumentError('Incorrect Function Id provided');
        }

        if (this.listening[requestID]) {
            clearTimeout(this.listening[requestID].timeout);
            delete this.listening[requestID];
        }

        await this.modelProxy(model).cancel(requestID);
    }

    async listen(requestID, functionID, onUpdate): Promise<void> {
        const model = this.cachedList.find((_model) => _model.id === functionID);
        if (!model) {
            throw new ArgumentError('Incorrect Function Id provided');
        }
        const timeoutCallback = async (): Promise<void> => {
            try {
                this.listening[requestID].timeout = null;
                const response = await this.modelProxy(model)?.status(requestID);

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
            functionID,
            timeout: setTimeout(timeoutCallback, 2000),
        };
    }

    modelProxy(model: MLModel): ModelProxy | undefined {
        return this.proxyMap[model.provider];
    }
}

export default new LambdaManager();
