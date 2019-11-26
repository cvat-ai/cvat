import { AnyAction, Dispatch, ActionCreator } from 'redux';
import { ThunkAction } from 'redux-thunk';

import getCore from '../core';
import { getCVATStore } from '../store';
import { Model, ModelFiles, CombinedState } from '../reducers/interfaces';

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
    INFER_MODEL = 'INFER_MODEL',
    INFER_MODEL_SUCCESS = 'INFER_MODEL_SUCCESS',
    INFER_MODEL_FAILED = 'INFER_MODEL_FAILED',
    GET_INFERENCE_STATUS = 'GET_INFERENCE_STATUS',
    GET_INFERENCE_STATUS_SUCCESS = 'GET_INFERENCE_STATUS_SUCCESS',
    GET_INFERENCE_STATUS_FAILED = 'GET_INFERENCE_STATUS_FAILED',
    SHOW_RUN_MODEL_DIALOG = 'SHOW_RUN_MODEL_DIALOG',
    CLOSE_RUN_MODEL_DIALOG = 'CLOSE_RUN_MODEL_DIALOG',
}

export enum PreinstalledModels {
    RCNN = 'RCNN Object Detector',
    MaskRCNN = 'Mask RCNN Object Detector',
}

const core = getCore();
const baseURL = core.config.backendAPI.slice(0, -7);

function getModels(): AnyAction {
    const action = {
        type: ModelsActionTypes.GET_MODELS,
        payload: {},
    };

    return action;
}

function getModelsSuccess(models: Model[]): AnyAction {
    const action = {
        type: ModelsActionTypes.GET_MODELS_SUCCESS,
        payload: {
            models,
        },
    };

    return action;
}

function getModelsFailed(error: any): AnyAction {
    const action = {
        type: ModelsActionTypes.GET_MODELS_FAILED,
        payload: {
            error,
        },
    };

    return action;
}

export function getModelsAsync():
ThunkAction<Promise<void>, {}, {}, AnyAction> {
    return async (dispatch: ActionCreator<Dispatch>): Promise<void> => {
        const store = getCVATStore();
        const state: CombinedState = store.getState();
        const OpenVINO = state.plugins.plugins.AUTO_ANNOTATION;
        const RCNN = state.plugins.plugins.TF_ANNOTATION;
        const MaskRCNN = state.plugins.plugins.TF_SEGMENTATION;

        dispatch(getModels());
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
            dispatch(getModelsFailed(error));
            return;
        }

        dispatch(getModelsSuccess(models));
    };
}

function deleteModel(id: number): AnyAction {
    const action = {
        type: ModelsActionTypes.DELETE_MODEL,
        payload: {
            id,
        },
    };

    return action;
}

function deleteModelSuccess(id: number): AnyAction {
    const action = {
        type: ModelsActionTypes.DELETE_MODEL_SUCCESS,
        payload: {
            id,
        },
    };

    return action;
}

function deleteModelFailed(id: number, error: any): AnyAction {
    const action = {
        type: ModelsActionTypes.DELETE_MODEL_FAILED,
        payload: {
            error,
            id,
        },
    };

    return action;
}

export function deleteModelAsync(id: number): ThunkAction<Promise<void>, {}, {}, AnyAction> {
    return async (dispatch: ActionCreator<Dispatch>): Promise<void> => {
        dispatch(deleteModel(id));
        try {
            await core.server.request(`${baseURL}/auto_annotation/delete/${id}`, {
                method: 'DELETE',
            });
        } catch (error) {
            dispatch(deleteModelFailed(id, error));
            return;
        }

        dispatch(deleteModelSuccess(id));
    };
}


function createModel(): AnyAction {
    const action = {
        type: ModelsActionTypes.CREATE_MODEL,
        payload: {},
    };

    return action;
}

function createModelSuccess(): AnyAction {
    const action = {
        type: ModelsActionTypes.CREATE_MODEL_SUCCESS,
        payload: {},
    };

    return action;
}

function createModelFailed(error: any): AnyAction {
    const action = {
        type: ModelsActionTypes.CREATE_MODEL_FAILED,
        payload: {
            error,
        },
    };

    return action;
}

function createModelUpdateStatus(status: string): AnyAction {
    const action = {
        type: ModelsActionTypes.CREATE_MODEL_STATUS_UPDATED,
        payload: {
            status,
        },
    };

    return action;
}

export function createModelAsync(name: string, files: ModelFiles, global: boolean):
ThunkAction<Promise<void>, {}, {}, AnyAction> {
    return async (dispatch: ActionCreator<Dispatch>): Promise<void> => {
        async function checkCallback(id: string): Promise<void> {
            try {
                const data = await core.server.request(
                    `${baseURL}/auto_annotation/check/${id}`, {
                        method: 'GET',
                    },
                );

                switch (data.status) {
                    case 'failed':
                        dispatch(createModelFailed(
                            `Checking request has returned the "${data.status}" status. Message: ${data.error}`,
                        ));
                        break;
                    case 'unknown':
                        dispatch(createModelFailed(
                            `Checking request has returned the "${data.status}" status.`,
                        ));
                        break;
                    case 'finished':
                        dispatch(createModelSuccess());
                        break;
                    default:
                        if ('progress' in data) {
                            createModelUpdateStatus(data.progress);
                        }
                        setTimeout(checkCallback.bind(null, id), 1000);
                }
            } catch (error) {
                dispatch(createModelFailed(error));
            }
        }

        dispatch(createModel());
        const data = new FormData();
        data.append('name', name);
        data.append('storage', typeof files.bin === 'string' ? 'shared' : 'local');
        data.append('shared', global.toString());
        Object.keys(files).reduce((acc, key: string): FormData => {
            acc.append(key, files[key]);
            return acc;
        }, data);

        try {
            dispatch(createModelUpdateStatus('Request is beign sent..'));
            const response = await core.server.request(
                `${baseURL}/auto_annotation/create`, {
                    method: 'POST',
                    data,
                    contentType: false,
                    processData: false,
                },
            );

            dispatch(createModelUpdateStatus('Request is being processed..'));
            setTimeout(checkCallback.bind(null, response.id), 1000);
        } catch (error) {
            dispatch(createModelFailed(error));
        }
    };
}

function inferModel(): AnyAction {
    const action = {
        type: ModelsActionTypes.INFER_MODEL,
        payload: {},
    };

    return action;
}

function inferModelSuccess(): AnyAction {
    const action = {
        type: ModelsActionTypes.INFER_MODEL_SUCCESS,
        payload: {},
    };

    return action;
}

function inferModelFailed(error: any): AnyAction {
    const action = {
        type: ModelsActionTypes.INFER_MODEL_FAILED,
        payload: {
            error,
        },
    };

    return action;
}

export function inferModelAsync(
    taskInstance: any,
    model: Model,
    mapping: {
        [index: string]: string;
    },
    cleanOut: boolean,
): ThunkAction<Promise<void>, {}, {}, AnyAction> {
    return async (dispatch: ActionCreator<Dispatch>): Promise<void> => {
        dispatch(inferModel());

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
        } catch (error) {
            dispatch(inferModelFailed(error));
            return;
        }

        dispatch(inferModelSuccess());
    };
}

export function closeRunModelDialog(): AnyAction {
    const action = {
        type: ModelsActionTypes.CLOSE_RUN_MODEL_DIALOG,
        payload: {},
    };

    return action;
}

export function showRunModelDialog(taskInstance: any): AnyAction {
    const action = {
        type: ModelsActionTypes.SHOW_RUN_MODEL_DIALOG,
        payload: {
            taskInstance,
        },
    };

    return action;
}
