import { AnyAction, Dispatch, ActionCreator } from 'redux';
import { ThunkAction } from 'redux-thunk';

import getCore from '../core';
import { Model } from '../reducers/interfaces';

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
    UPDATE_MODEL = 'UPDATE_MODEL',
    UPDATE_MODEL_SUCCESS = 'UPDATE_MODEL_SUCCESS',
    UPDATE_MODEL_FAILED = 'UPDATE_MODEL_FAILED',
    INFER_MODEL = 'INFER_MODEL',
    INFER_MODEL_SUCCESS = 'INFER_MODEL_SUCCESS',
    INFER_MODEL_FAILED = 'INFER_MODEL_FAILED',
    COLLECT_INFERENCE_STATUS = 'COLLECT_INFERENCE_STATUS',
    COLLECT_INFERENCE_STATUS_SUCCESS = 'COLLECT_INFERENCE_STATUS_SUCCESS',
    COLLECT_INFERENCE_STATUS_FAILED = 'COLLECT_INFERENCE_STATUS_FAILED',
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

export function getModelsAsync(OpenVINO: boolean, RCNN: boolean, MaskRCNN: boolean):
ThunkAction<Promise<void>, {}, {}, AnyAction> {
    return async (dispatch: ActionCreator<Dispatch>): Promise<void> => {
        dispatch(getModels());
        const models: Model[] = [];

        try {
            if (OpenVINO) {
                const response = await core.server.request(
                    `${baseURL}/auto_annotation/meta/get`, {
                        method: 'GET',
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

function createModelFailed(): AnyAction {
    const action = {
        type: ModelsActionTypes.CREATE_MODEL_FAILED,
        payload: {},
    };

    return action;
}

export function createModelAsync(): ThunkAction<Promise<void>, {}, {}, AnyAction> {
    return async (dispatch: ActionCreator<Dispatch>): Promise<void> => {

    };
}

function updateModel(): AnyAction {
    const action = {
        type: ModelsActionTypes.UPDATE_MODEL,
        payload: {},
    };

    return action;
}

function updateModelSuccess(): AnyAction {
    const action = {
        type: ModelsActionTypes.UPDATE_MODEL_SUCCESS,
        payload: {},
    };

    return action;
}

function updateModelFailed(): AnyAction {
    const action = {
        type: ModelsActionTypes.UPDATE_MODEL_FAILED,
        payload: {},
    };

    return action;
}

export function updateModelAsync(): ThunkAction<Promise<void>, {}, {}, AnyAction> {
    return async (dispatch: ActionCreator<Dispatch>): Promise<void> => {

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

function inferModelFailed(): AnyAction {
    const action = {
        type: ModelsActionTypes.INFER_MODEL_FAILED,
        payload: {},
    };

    return action;
}

function updateInferStatus(): AnyAction {
    const action = {
        type: ModelsActionTypes.UPDATE_INFER_STATUS,
        payload: {},
    };

    return action;
}

export function inferModelAsync(): ThunkAction<Promise<void>, {}, {}, AnyAction> {
    return async (dispatch: ActionCreator<Dispatch>): Promise<void> => {

    };
}
