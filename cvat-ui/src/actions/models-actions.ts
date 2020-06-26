// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import { ActionUnion, createAction, ThunkAction } from 'utils/redux';
import {
    Model,
    ModelFiles,
    ActiveInference,
    CombinedState,
} from 'reducers/interfaces';
import getCore from 'cvat-core-wrapper';

export enum PreinstalledModels {
    RCNN = 'RCNN Object Detector',
    MaskRCNN = 'Mask RCNN Object Detector',
}

export enum ModelsActionTypes {
    GET_MODELS = 'GET_MODELS',
    GET_MODELS_SUCCESS = 'GET_MODELS_SUCCESS',
    GET_MODELS_FAILED = 'GET_MODELS_FAILED',
    DELETE_MODEL = 'DELETE_MODEL',
    DELETE_MODEL_SUCCESS = 'DELETE_MODEL_SUCCESS',
    DELETE_MODEL_FAILED = 'DELETE_MODEL_FAILED',
    CREATE_MODEL = 'CREATE_MODEL',
    CREATE_MODEL_SUCCESS = 'CREATE_MODEL_SUCCESS',
    CREATE_MODEL_FAILED = 'CREATE_MODEL_FAILED',
    CREATE_MODEL_STATUS_UPDATED = 'CREATE_MODEL_STATUS_UPDATED',
    START_INFERENCE_FAILED = 'START_INFERENCE_FAILED',
    GET_INFERENCE_STATUS_SUCCESS = 'GET_INFERENCE_STATUS_SUCCESS',
    GET_INFERENCE_STATUS_FAILED = 'GET_INFERENCE_STATUS_FAILED',
    FETCH_META_FAILED = 'FETCH_META_FAILED',
    SHOW_RUN_MODEL_DIALOG = 'SHOW_RUN_MODEL_DIALOG',
    CLOSE_RUN_MODEL_DIALOG = 'CLOSE_RUN_MODEL_DIALOG',
    CANCEL_INFERENCE_SUCCESS = 'CANCEL_INFERENCE_SUCCESS',
    CANCEL_INFERENCE_FAILED = 'CANCEL_INFERENCE_FAILED',
}

export const modelsActions = {
    getModels: () => createAction(ModelsActionTypes.GET_MODELS),
    getModelsSuccess: (models: Model[]) => createAction(
        ModelsActionTypes.GET_MODELS_SUCCESS, {
            models,
        },
    ),
    getModelsFailed: (error: any) => createAction(
        ModelsActionTypes.GET_MODELS_FAILED, {
            error,
        },
    ),
    deleteModelSuccess: (id: number) => createAction(
        ModelsActionTypes.DELETE_MODEL_SUCCESS, {
            id,
        },
    ),
    deleteModelFailed: (id: number, error: any) => createAction(
        ModelsActionTypes.DELETE_MODEL_FAILED, {
            error, id,
        },
    ),
    createModel: () => createAction(ModelsActionTypes.CREATE_MODEL),
    createModelSuccess: () => createAction(ModelsActionTypes.CREATE_MODEL_SUCCESS),
    createModelFailed: (error: any) => createAction(
        ModelsActionTypes.CREATE_MODEL_FAILED, {
            error,
        },
    ),
    createModelUpdateStatus: (status: string) => createAction(
        ModelsActionTypes.CREATE_MODEL_STATUS_UPDATED, {
            status,
        },
    ),
    fetchMetaFailed: (error: any) => createAction(ModelsActionTypes.FETCH_META_FAILED, { error }),
    getInferenceStatusSuccess: (taskID: number, activeInference: ActiveInference) => createAction(
        ModelsActionTypes.GET_INFERENCE_STATUS_SUCCESS, {
            taskID,
            activeInference,
        },
    ),
    getInferenceStatusFailed: (taskID: number, error: any) => createAction(
        ModelsActionTypes.GET_INFERENCE_STATUS_FAILED, {
            taskID,
            error,
        },
    ),
    startInferenceFailed: (taskID: number, error: any) => createAction(
        ModelsActionTypes.START_INFERENCE_FAILED, {
            taskID,
            error,
        },
    ),
    cancelInferenceSuccess: (taskID: number) => createAction(
        ModelsActionTypes.CANCEL_INFERENCE_SUCCESS, {
            taskID,
        },
    ),
    cancelInferenceFailed: (taskID: number, error: any) => createAction(
        ModelsActionTypes.CANCEL_INFERENCE_FAILED, {
            taskID,
            error,
        },
    ),
    closeRunModelDialog: () => createAction(ModelsActionTypes.CLOSE_RUN_MODEL_DIALOG),
    showRunModelDialog: (taskInstance: any) => createAction(
        ModelsActionTypes.SHOW_RUN_MODEL_DIALOG, {
            taskInstance,
        },
    ),
};

export type ModelsActions = ActionUnion<typeof modelsActions>;

const core = getCore();
const baseURL = core.config.backendAPI.slice(0, -7);

export function getModelsAsync(): ThunkAction {
    return async (dispatch, getState): Promise<void> => {
        dispatch(modelsActions.getModels());
        const models: Model[] = [];

        try {
            const response = await core.server.request(
                `${core.config.backendAPI}/lambda/functions`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                },
            );

            for (const model of response) {
                if (model.kind === 'detector') {
                    models.push({
                        id: model.id,
                        primary: true,
                        name: model.name,
                        description: model.description,
                        framework: model.framework,
                        labels: [...model.labels],
                        type: model.kind,
                    });
                }
            }
        } catch (error) {
            dispatch(modelsActions.getModelsFailed(error));
            return;
        }

        dispatch(modelsActions.getModelsSuccess(models));
    };
}

export function deleteModelAsync(id: number): ThunkAction {
    return async (dispatch): Promise<void> => {
        try {
            await core.server.request(`${baseURL}/auto_annotation/delete/${id}`, {
                method: 'DELETE',
            });
        } catch (error) {
            dispatch(modelsActions.deleteModelFailed(id, error));
            return;
        }

        dispatch(modelsActions.deleteModelSuccess(id));
    };
}

export function createModelAsync(name: string, files: ModelFiles, global: boolean): ThunkAction {
    return async (dispatch): Promise<void> => {
        async function checkCallback(id: string): Promise<void> {
            try {
                const data = await core.server.request(
                    `${baseURL}/auto_annotation/check/${id}`, {
                        method: 'GET',
                    },
                );

                switch (data.status) {
                    case 'failed':
                        dispatch(modelsActions.createModelFailed(
                            `Checking request has returned the "${data.status}" status. Message: ${data.error}`,
                        ));
                        break;
                    case 'unknown':
                        dispatch(modelsActions.createModelFailed(
                            `Checking request has returned the "${data.status}" status.`,
                        ));
                        break;
                    case 'finished':
                        dispatch(modelsActions.createModelSuccess());
                        break;
                    default:
                        if ('progress' in data) {
                            modelsActions.createModelUpdateStatus(data.progress);
                        }
                        setTimeout(checkCallback.bind(null, id), 1000);
                }
            } catch (error) {
                dispatch(modelsActions.createModelFailed(error));
            }
        }

        dispatch(modelsActions.createModel());
        const data = new FormData();
        data.append('name', name);
        data.append('storage', typeof files.bin === 'string' ? 'shared' : 'local');
        data.append('shared', global.toString());
        Object.keys(files).reduce((acc, key: string): FormData => {
            acc.append(key, files[key]);
            return acc;
        }, data);

        try {
            dispatch(modelsActions.createModelUpdateStatus('Request is beign sent..'));
            const response = await core.server.request(
                `${baseURL}/auto_annotation/create`, {
                    method: 'POST',
                    data,
                    contentType: false,
                    processData: false,
                },
            );

            dispatch(modelsActions.createModelUpdateStatus('Request is being processed..'));
            setTimeout(checkCallback.bind(null, response.id), 1000);
        } catch (error) {
            dispatch(modelsActions.createModelFailed(error));
        }
    };
}

interface InferenceMeta {
    active: boolean;
    taskID: number;
    requestID: string;
}

const timers: any = {};

async function timeoutCallback(
    url: string,
    taskID: number,
    dispatch: (action: ModelsActions) => void,
): Promise<void> {
    try {
        delete timers[taskID];

        const response = await core.server.request(url, {
            method: 'GET',
        });

        const activeInference: ActiveInference = {
            status: response.status,
            progress: +response.progress || 0,
            error: response.exc_info || '',
            id: response.id,
        };


        if (activeInference.status === 'unknown') {
            dispatch(modelsActions.getInferenceStatusFailed(
                taskID,
                new Error(
                    `Inference status for the task ${taskID} is unknown.`,
                ),
            ));

            return;
        }

        if (activeInference.status === 'failed') {
            dispatch(modelsActions.getInferenceStatusFailed(
                taskID,
                new Error(
                    `Inference status for the task ${taskID} is failed. ${activeInference.error}`,
                ),
            ));

            return;
        }

        if (activeInference.status !== 'finished') {
            timers[taskID] = setTimeout(
                timeoutCallback.bind(
                    null,
                    url,
                    taskID,
                    dispatch,
                ), 3000,
            );
        }

        dispatch(modelsActions.getInferenceStatusSuccess(taskID, activeInference));
    } catch (error) {
        dispatch(modelsActions.getInferenceStatusFailed(taskID, new Error(
            `Server request for the task ${taskID} was failed`,
        )));
    }
}

function subscribe(
    inferenceMeta: InferenceMeta,
    dispatch: (action: ModelsActions) => void,
): void {
    if (!(inferenceMeta.taskID in timers)) {
        const requestURL = `${core.config.backendAPI}/lambda/requests/${inferenceMeta.requestID}`;
        timers[inferenceMeta.taskID] = setTimeout(
            timeoutCallback.bind(
                null,
                requestURL,
                inferenceMeta.taskID,
                dispatch,
            ),
        );
    }
}

export function getInferenceStatusAsync(tasks: number[]): ThunkAction {
    return async (dispatch, getState): Promise<void> => {
        const dispatchCallback = (action: ModelsActions): void => {
            dispatch(action);
        };

        try {
            const response = await core.server.request(
                `${core.config.backendAPI}/lambda/requests`, {
                    method: 'GET',
                },
            );

            response
                .map((request: any): InferenceMeta => ({
                    taskID: +request.function.task,
                    requestID: request.id,
                    active: request.progress < 100,
                }))
                .filter((inferenceMeta: InferenceMeta): boolean => inferenceMeta.active)
                .forEach((inferenceMeta: InferenceMeta): void => {
                    subscribe(inferenceMeta, dispatchCallback);
                });
        } catch (error) {
            dispatch(modelsActions.fetchMetaFailed(error));
        }
    };
}

export function startInferenceAsync(
    taskInstance: any,
    model: Model,
    mapping: {
        [index: string]: string;
    },
    cleanOut: boolean,
): ThunkAction {
    return async (dispatch): Promise<void> => {
        try {
            await core.server.request(
                `${baseURL}/api/v1/lambda/requests`, {
                    method: 'POST',
                    data: JSON.stringify({
                        cleanup: cleanOut,
                        mapping,
                        task: taskInstance.id,
                        function: model.id,
                    }),
                    headers: {
                        'Content-Type': 'application/json',
                    },
                },
            );

            dispatch(getInferenceStatusAsync([taskInstance.id]));
        } catch (error) {
            dispatch(modelsActions.startInferenceFailed(taskInstance.id, error));
        }
    };
}

export function cancelInferenceAsync(taskID: number): ThunkAction {
    return async (dispatch, getState): Promise<void> => {
        try {
            const inference = getState().models.inferences[taskID];
            if (inference) {
                await core.server.request(
                    `${baseURL}/api/v1/lambda/requests/${inference.id}`, {
                        method: 'DELETE',
                    },
                );

                if (timers[taskID]) {
                    clearTimeout(timers[taskID]);
                    delete timers[taskID];
                }
            }

            dispatch(modelsActions.cancelInferenceSuccess(taskID));
        } catch (error) {
            dispatch(modelsActions.cancelInferenceFailed(taskID, error));
        }
    };
}
