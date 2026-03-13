// Copyright (C) 2019-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import serverProxy from './server-proxy';
import { ArgumentError } from './exceptions';
import MLModel from './ml-model';
import {
    ModelKind, RQStatus, ShapeType, Source,
} from './enums';
import { SerializedCollection, SerializedShape } from './server-response-types';
import { mask2Rle } from './rle-utils';

type InteractorShape = Pick<SerializedShape, 'group' | 'source' | 'attributes' | 'occluded' | 'rotation' | 'type'> & {
    points: Int32Array;
};

// This type is compatible with our SerializedCollection, however the client only supports it partly
// The idea behind is to let us extend it in the future by necessary
// And at the same type to keep compatibility with existing interactors by converting old type in runtime
// Also supported service "confidence" attribute in attributes list with "spec_id" equal to 0
export type InteractorResults = {
    shapes: InteractorShape[];
};

export interface MinimalShape {
    type: ShapeType;
    points: number[];
}

export interface TrackerResults {
    states: any[];
    shapes: MinimalShape[];
}

class LambdaManager {
    private cachedList: MLModel[];
    private listening: Record<number, {
        onUpdate: ((status: RQStatus, progress: number, message?: string) => void)[];
        functionID: string;
        timeout: number | null;
    }>;

    constructor() {
        this.listening = {};
        this.cachedList = [];
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

        this.cachedList = models;
        return { models, count: lambdaFunctions.length };
    }

    async run(taskID: number, model: MLModel, args: any): Promise<string> {
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

        const result = await serverProxy.lambda.run(body);
        return result.id;
    }

    async call(taskID, model, args): Promise<TrackerResults | InteractorResults | SerializedCollection> {
        if (!Number.isInteger(taskID) || taskID < 0) {
            throw new ArgumentError(`Argument taskID must be a positive integer. Got "${taskID}"`);
        }

        const body = { ...args, task: taskID };
        const result = await serverProxy.lambda.call(model.id, body);

        if (model.kind === ModelKind.INTERACTOR && typeof result === 'object') {
            if ('mask' in result) {
                // wrap old interactor interfaces for backward compatibility
                const maskHeight = result.mask.length;
                const maskWidth = result.mask[0].length;
                const rle = mask2Rle(result.mask.flat());
                if (!rle.length) {
                    rle.push(0, 0, 0, 0);
                } else {
                    rle.push(0, 0, maskWidth - 1, maskHeight - 1);
                }
                return {
                    shapes: [{
                        points: Int32Array.from(rle),
                        group: 0,
                        source: Source.SEMI_AUTO,
                        attributes: [],
                        occluded: false,
                        rotation: 0,
                        type: ShapeType.MASK,
                    }],
                };
            }

            if (Array.isArray(result.shapes)) {
                // perhaps already returned object according to the new interface
                // in this case we just skip shapes which are not supported on client
                return {
                    shapes: (result as InteractorResults).shapes.map((item) => ({
                        points: Int32Array.from(item.points),
                        group: typeof item.group === 'number' ? item.group : 0,
                        source: Source.SEMI_AUTO,
                        attributes: Array.isArray(item.attributes) && item.attributes.every((attr) => {
                            if (typeof attr !== 'object') {
                                return false;
                            }
                            return typeof attr === 'object' &&
                                typeof attr.spec_id === 'number' &&
                                typeof attr.value === 'string';
                        }) ? item.attributes : [],
                        occluded: typeof item.occluded === 'boolean' ? item.occluded : false,
                        rotation: typeof item.rotation === 'number' ? item.rotation : 0,
                        type: item.type ?? ShapeType.MASK,
                    })).filter((item) => item.type === ShapeType.MASK),
                };
            }
        }

        return result;
    }

    async requests(): Promise<any[]> {
        const lambdaRequests = await serverProxy.lambda.requests();
        return lambdaRequests
            .filter((request) => [RQStatus.QUEUED, RQStatus.STARTED].includes(request.status));
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

        await serverProxy.lambda.cancel(requestID);
    }

    async listen(
        requestID: string,
        functionID: string | number,
        callback: (status: RQStatus, progress: number, message?: string) => void,
    ): Promise<void> {
        const model = this.cachedList.find((_model) => _model.id === functionID);
        if (!model) {
            throw new ArgumentError('Incorrect function Id provided');
        }

        if (requestID in this.listening) {
            this.listening[requestID].onUpdate.push(callback);
            // already listening, avoid sending extra requests
            return;
        }
        const timeoutCallback = (): void => {
            serverProxy.lambda.status(requestID).then((response) => {
                const { status } = response;
                if (requestID in this.listening) {
                    // check it was not cancelled
                    const { onUpdate } = this.listening[requestID];
                    if ([RQStatus.QUEUED, RQStatus.STARTED].includes(status)) {
                        onUpdate.forEach((update) => update(status, response.progress || 0));
                        this.listening[requestID].timeout = window
                            .setTimeout(timeoutCallback, status === RQStatus.QUEUED ? 30000 : 10000);
                    } else {
                        delete this.listening[requestID];
                        if (status === RQStatus.FINISHED) {
                            onUpdate
                                .forEach((update) => update(status, response.progress || 100));
                        } else {
                            onUpdate
                                .forEach((update) => update(status, response.progress || 0, response.exc_info || ''));
                        }
                    }
                }
            }).catch((error) => {
                if (requestID in this.listening) {
                    // check it was not cancelled
                    const { onUpdate } = this.listening[requestID];
                    onUpdate
                        .forEach((update) => update(
                            RQStatus.UNKNOWN,
                            0,
                            `Could not get a status of the request ${requestID}. ${error.toString()}`,
                        ));
                }
            }).finally(() => {
                if (requestID in this.listening) {
                    this.listening[requestID].timeout = null;
                }
            });
        };

        this.listening[requestID] = {
            onUpdate: [callback],
            functionID,
            timeout: window.setTimeout(timeoutCallback),
        };
    }
}

export default new LambdaManager();
