// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import { ActionUnion, createAction, ThunkAction } from 'utils/redux';
import {
    Model,
    ModelType,
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
    cancelInferenceFaild: (taskID: number, error: any) => createAction(
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
        const state: CombinedState = getState();
        const OpenVINO = state.plugins.list.AUTO_ANNOTATION;
        const RCNN = state.plugins.list.TF_ANNOTATION;
        const MaskRCNN = state.plugins.list.TF_SEGMENTATION;

        dispatch(modelsActions.getModels());
        const models: Model[] = [];

        try {
            if (OpenVINO) {
                const response = await core.server.request(
                    `${baseURL}/auto_annotation/meta/get`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        data: JSON.stringify([]),
                    },
                );


                for (const model of response.models) {
                    models.push({
                        id: model.id,
                        ownerID: model.owner,
                        primary: model.primary,
                        name: model.name,
                        uploadDate: model.uploadDate,
                        updateDate: model.updateDate,
                        labels: [...model.labels],
                    });
                }
            }

            if (RCNN) {
                models.push({
                    id: null,
                    ownerID: null,
                    primary: true,
                    name: PreinstalledModels.RCNN,
                    uploadDate: '',
                    updateDate: '',
                    labels: ['surfboard', 'car', 'skateboard', 'boat', 'clock',
                        'cat', 'cow', 'knife', 'apple', 'cup', 'tv',
                        'baseball_bat', 'book', 'suitcase', 'tennis_racket',
                        'stop_sign', 'couch', 'cell_phone', 'keyboard',
                        'cake', 'tie', 'frisbee', 'truck', 'fire_hydrant',
                        'snowboard', 'bed', 'vase', 'teddy_bear',
                        'toaster', 'wine_glass', 'traffic_light',
                        'broccoli', 'backpack', 'carrot', 'potted_plant',
                        'donut', 'umbrella', 'parking_meter', 'bottle',
                        'sandwich', 'motorcycle', 'bear', 'banana',
                        'person', 'scissors', 'elephant', 'dining_table',
                        'toothbrush', 'toilet', 'skis', 'bowl', 'sheep',
                        'refrigerator', 'oven', 'microwave', 'train',
                        'orange', 'mouse', 'laptop', 'bench', 'bicycle',
                        'fork', 'kite', 'zebra', 'baseball_glove', 'bus',
                        'spoon', 'horse', 'handbag', 'pizza', 'sports_ball',
                        'airplane', 'hair_drier', 'hot_dog', 'remote',
                        'sink', 'dog', 'bird', 'giraffe', 'chair',
                    ],
                });
            }

            if (MaskRCNN) {
                models.push({
                    id: null,
                    ownerID: null,
                    primary: true,
                    name: PreinstalledModels.MaskRCNN,
                    uploadDate: '',
                    updateDate: '',
                    labels: ['BG', 'person', 'bicycle', 'car', 'motorcycle', 'airplane',
                        'bus', 'train', 'truck', 'boat', 'traffic light',
                        'fire hydrant', 'stop sign', 'parking meter', 'bench', 'bird',
                        'cat', 'dog', 'horse', 'sheep', 'cow', 'elephant', 'bear',
                        'zebra', 'giraffe', 'backpack', 'umbrella', 'handbag', 'tie',
                        'suitcase', 'frisbee', 'skis', 'snowboard', 'sports ball',
                        'kite', 'baseball bat', 'baseball glove', 'skateboard',
                        'surfboard', 'tennis racket', 'bottle', 'wine glass', 'cup',
                        'fork', 'knife', 'spoon', 'bowl', 'banana', 'apple',
                        'sandwich', 'orange', 'broccoli', 'carrot', 'hot dog', 'pizza',
                        'donut', 'cake', 'chair', 'couch', 'potted plant', 'bed',
                        'dining table', 'toilet', 'tv', 'laptop', 'mouse', 'remote',
                        'keyboard', 'cell phone', 'microwave', 'oven', 'toaster',
                        'sink', 'refrigerator', 'book', 'clock', 'vase', 'scissors',
                        'teddy bear', 'hair drier', 'toothbrush',
                    ],
                });
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
    modelType: ModelType;
}

const timers: any = {};

async function timeoutCallback(
    url: string,
    taskID: number,
    modelType: ModelType,
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
            error: response.error || response.stderr || '',
            modelType,
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
                    modelType,
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
        let requestURL = `${baseURL}`;
        if (inferenceMeta.modelType === ModelType.OPENVINO) {
            requestURL = `${requestURL}/auto_annotation/check`;
        } else if (inferenceMeta.modelType === ModelType.RCNN) {
            requestURL = `${requestURL}/tensorflow/annotation/check/task`;
        } else if (inferenceMeta.modelType === ModelType.MASK_RCNN) {
            requestURL = `${requestURL}/tensorflow/segmentation/check/task`;
        }
        requestURL = `${requestURL}/${inferenceMeta.requestID}`;
        timers[inferenceMeta.taskID] = setTimeout(
            timeoutCallback.bind(
                null,
                requestURL,
                inferenceMeta.taskID,
                inferenceMeta.modelType,
                dispatch,
            ),
        );
    }
}

export function getInferenceStatusAsync(tasks: number[]): ThunkAction {
    return async (dispatch, getState): Promise<void> => {
        function parse(response: any, modelType: ModelType): InferenceMeta[] {
            return Object.keys(response).map((key: string): InferenceMeta => ({
                taskID: +key,
                requestID: response[key].rq_id || key,
                active: typeof (response[key].active) === 'undefined' ? ['queued', 'started']
                    .includes(response[key].status.toLowerCase()) : response[key].active,
                modelType,
            }));
        }

        const state: CombinedState = getState();
        const OpenVINO = state.plugins.list.AUTO_ANNOTATION;
        const RCNN = state.plugins.list.TF_ANNOTATION;
        const MaskRCNN = state.plugins.list.TF_SEGMENTATION;

        const dispatchCallback = (action: ModelsActions): void => {
            dispatch(action);
        };

        try {
            if (OpenVINO) {
                const response = await core.server.request(
                    `${baseURL}/auto_annotation/meta/get`, {
                        method: 'POST',
                        data: JSON.stringify(tasks),
                        headers: {
                            'Content-Type': 'application/json',
                        },
                    },
                );

                parse(response.run, ModelType.OPENVINO)
                    .filter((inferenceMeta: InferenceMeta): boolean => inferenceMeta.active)
                    .forEach((inferenceMeta: InferenceMeta): void => {
                        subscribe(inferenceMeta, dispatchCallback);
                    });
            }

            if (RCNN) {
                const response = await core.server.request(
                    `${baseURL}/tensorflow/annotation/meta/get`, {
                        method: 'POST',
                        data: JSON.stringify(tasks),
                        headers: {
                            'Content-Type': 'application/json',
                        },
                    },
                );

                parse(response, ModelType.RCNN)
                    .filter((inferenceMeta: InferenceMeta): boolean => inferenceMeta.active)
                    .forEach((inferenceMeta: InferenceMeta): void => {
                        subscribe(inferenceMeta, dispatchCallback);
                    });
            }

            if (MaskRCNN) {
                const response = await core.server.request(
                    `${baseURL}/tensorflow/segmentation/meta/get`, {
                        method: 'POST',
                        data: JSON.stringify(tasks),
                        headers: {
                            'Content-Type': 'application/json',
                        },
                    },
                );

                parse(response, ModelType.MASK_RCNN)
                    .filter((inferenceMeta: InferenceMeta): boolean => inferenceMeta.active)
                    .forEach((inferenceMeta: InferenceMeta): void => {
                        subscribe(inferenceMeta, dispatchCallback);
                    });
            }
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
            if (model.name === PreinstalledModels.RCNN) {
                await core.server.request(
                    `${baseURL}/tensorflow/annotation/create/task/${taskInstance.id}`,
                );
            } else if (model.name === PreinstalledModels.MaskRCNN) {
                await core.server.request(
                    `${baseURL}/tensorflow/segmentation/create/task/${taskInstance.id}`,
                );
            } else {
                await core.server.request(
                    `${baseURL}/auto_annotation/start/${model.id}/${taskInstance.id}`, {
                        method: 'POST',
                        data: JSON.stringify({
                            reset: cleanOut,
                            labels: mapping,
                        }),
                        headers: {
                            'Content-Type': 'application/json',
                        },
                    },
                );
            }

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
                if (inference.modelType === ModelType.OPENVINO) {
                    await core.server.request(
                        `${baseURL}/auto_annotation/cancel/${taskID}`,
                    );
                } else if (inference.modelType === ModelType.RCNN) {
                    await core.server.request(
                        `${baseURL}/tensorflow/annotation/cancel/task/${taskID}`,
                    );
                } else if (inference.modelType === ModelType.MASK_RCNN) {
                    await core.server.request(
                        `${baseURL}/tensorflow/segmentation/cancel/task/${taskID}`,
                    );
                }

                if (timers[taskID]) {
                    clearTimeout(timers[taskID]);
                    delete timers[taskID];
                }
            }

            dispatch(modelsActions.cancelInferenceSuccess(taskID));
        } catch (error) {
            dispatch(modelsActions.cancelInferenceFaild(taskID, error));
        }
    };
}
