// Copyright (C) 2020-2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

import { ActionUnion, createAction, ThunkAction } from 'utils/redux';
import { Model, ActiveInference, RQStatus } from 'reducers/interfaces';
import getCore from 'cvat-core-wrapper';

export enum ModelsActionTypes {
    GET_MODELS = 'GET_MODELS',
    GET_MODELS_SUCCESS = 'GET_MODELS_SUCCESS',
    GET_MODELS_FAILED = 'GET_MODELS_FAILED',
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
    getModelsSuccess: (models: Model[]) => createAction(ModelsActionTypes.GET_MODELS_SUCCESS, {
        models,
    }),
    getModelsFailed: (error: any) => createAction(ModelsActionTypes.GET_MODELS_FAILED, {
        error,
    }),
    fetchMetaFailed: (error: any) => createAction(ModelsActionTypes.FETCH_META_FAILED, { error }),
    getInferenceStatusSuccess: (taskID: number, activeInference: ActiveInference) => (
        createAction(ModelsActionTypes.GET_INFERENCE_STATUS_SUCCESS, {
            taskID,
            activeInference,
        })
    ),
    getInferenceStatusFailed: (taskID: number, error: any) => (
        createAction(ModelsActionTypes.GET_INFERENCE_STATUS_FAILED, {
            taskID,
            error,
        })
    ),
    startInferenceFailed: (taskID: number, error: any) => (
        createAction(ModelsActionTypes.START_INFERENCE_FAILED, {
            taskID,
            error,
        })
    ),
    cancelInferenceSuccess: (taskID: number) => (
        createAction(ModelsActionTypes.CANCEL_INFERENCE_SUCCESS, {
            taskID,
        })
    ),
    cancelInferenceFailed: (taskID: number, error: any) => (
        createAction(ModelsActionTypes.CANCEL_INFERENCE_FAILED, {
            taskID,
            error,
        })
    ),
    closeRunModelDialog: () => createAction(ModelsActionTypes.CLOSE_RUN_MODEL_DIALOG),
    showRunModelDialog: (taskInstance: any) => (
        createAction(ModelsActionTypes.SHOW_RUN_MODEL_DIALOG, {
            taskInstance,
        })
    ),
};

export type ModelsActions = ActionUnion<typeof modelsActions>;

const core = getCore();

export function getModelsAsync(): ThunkAction {
    return async (dispatch): Promise<void> => {
        dispatch(modelsActions.getModels());

        try {
            const models = await core.lambda.list();
            dispatch(modelsActions.getModelsSuccess(models));
        } catch (error) {
            dispatch(modelsActions.getModelsFailed(error));
        }
    };
}

interface InferenceMeta {
    taskID: number;
    requestID: string;
}

function listen(inferenceMeta: InferenceMeta, dispatch: (action: ModelsActions) => void): void {
    const { taskID, requestID } = inferenceMeta;
    core.lambda
        .listen(requestID, (status: RQStatus, progress: number, message: string) => {
            if (status === RQStatus.failed || status === RQStatus.unknown) {
                dispatch(
                    modelsActions.getInferenceStatusFailed(
                        taskID,
                        new Error(`Inference status for the task ${taskID} is ${status}. ${message}`),
                    ),
                );

                return;
            }

            dispatch(
                modelsActions.getInferenceStatusSuccess(taskID, {
                    status,
                    progress,
                    error: message,
                    id: requestID,
                }),
            );
        })
        .catch((error: Error) => {
            dispatch(
                modelsActions.getInferenceStatusFailed(taskID, {
                    status: 'unknown',
                    progress: 0,
                    error: error.toString(),
                    id: requestID,
                }),
            );
        });
}

export function getInferenceStatusAsync(): ThunkAction {
    return async (dispatch): Promise<void> => {
        const dispatchCallback = (action: ModelsActions): void => {
            dispatch(action);
        };

        try {
            const requests = await core.lambda.requests();
            requests
                .map((request: any): object => ({
                    taskID: +request.function.task,
                    requestID: request.id,
                }))
                .forEach((inferenceMeta: InferenceMeta): void => {
                    listen(inferenceMeta, dispatchCallback);
                });
        } catch (error) {
            dispatch(modelsActions.fetchMetaFailed(error));
        }
    };
}

export function startInferenceAsync(taskId: number, model: Model, body: object): ThunkAction {
    return async (dispatch): Promise<void> => {
        try {
            const requestID: string = await core.lambda.run(taskId, model, body);
            const dispatchCallback = (action: ModelsActions): void => {
                dispatch(action);
            };

            listen(
                {
                    taskID: taskId,
                    requestID,
                },
                dispatchCallback,
            );
        } catch (error) {
            dispatch(modelsActions.startInferenceFailed(taskId, error));
        }
    };
}

export function cancelInferenceAsync(taskID: number): ThunkAction {
    return async (dispatch, getState): Promise<void> => {
        try {
            const inference = getState().models.inferences[taskID];
            await core.lambda.cancel(inference.id);
            dispatch(modelsActions.cancelInferenceSuccess(taskID));
        } catch (error) {
            dispatch(modelsActions.cancelInferenceFailed(taskID, error));
        }
    };
}
