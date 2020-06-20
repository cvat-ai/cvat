// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import { boundariesActions, BoundariesActionTypes } from 'actions/boundaries-actions';
import { ModelsActionTypes, ModelsActions } from 'actions/models-actions';
import { AuthActionTypes, AuthActions } from 'actions/auth-actions';
import { ModelsState } from './interfaces';

const defaultState: ModelsState = {
    initialized: false,
    fetching: false,
    creatingStatus: '',
    models: [],
    visibleRunWindows: false,
    activeRunTask: null,
    inferences: {},
    visibleNewAnnotationWindows: false,
    activeNewAnnotationTask: null,
    baseModelList: [],
};

export default function (
    state = defaultState,
    action: ModelsActions | AuthActions | boundariesActions,
): ModelsState {
    switch (action.type) {
        case ModelsActionTypes.GET_MODELS: {
            return {
                ...state,
                initialized: false,
                fetching: true,
            };
        }
        case ModelsActionTypes.GET_MODELS_SUCCESS: {
            return {
                ...state,
                models: action.payload.models,
                initialized: true,
                fetching: false,
            };
        }
        case ModelsActionTypes.GET_MODELS_FAILED: {
            return {
                ...state,
                initialized: true,
                fetching: false,
            };
        }
        case ModelsActionTypes.DELETE_MODEL_SUCCESS: {
            return {
                ...state,
                models: state.models.filter(
                    (model): boolean => model.id !== action.payload.id,
                ),
            };
        }
        case ModelsActionTypes.CREATE_MODEL: {
            return {
                ...state,
                creatingStatus: '',
            };
        }
        case ModelsActionTypes.CREATE_MODEL_STATUS_UPDATED: {
            return {
                ...state,
                creatingStatus: action.payload.status,
            };
        }
        case ModelsActionTypes.CREATE_MODEL_FAILED: {
            return {
                ...state,
                creatingStatus: '',
            };
        }
        case ModelsActionTypes.CREATE_MODEL_SUCCESS: {
            return {
                ...state,
                initialized: false,
                creatingStatus: 'CREATED',
            };
        }
        case ModelsActionTypes.SHOW_RUN_MODEL_DIALOG: {
            return {
                ...state,
                visibleRunWindows: true,
                activeRunTask: action.payload.taskInstance,
            };
        }
        case ModelsActionTypes.CLOSE_RUN_MODEL_DIALOG: {
            return {
                ...state,
                visibleRunWindows: false,
                activeRunTask: null,
            };
        }
        case ModelsActionTypes.OPEN_NEW_ANNOTATION_DIALOG: {
            return {
                ...state,
                visibleNewAnnotationWindows: true,
                activeNewAnnotationTask: action.payload.taskInstance,
            };
        }
        case ModelsActionTypes.GET_BASE_MODEL: {
            return {
                ...state,
                baseModelList: action.payload.baseModelList,
            };
        }
        case ModelsActionTypes.CLOSE_NEW_ANNOTATION_DIALOG: {
            return {
                ...state,
                visibleNewAnnotationWindows: false,
                activeNewAnnotationTask: null,
            };
        }
        case ModelsActionTypes.GET_INFERENCE_STATUS_SUCCESS: {
            const { inferences } = state;
            if (action.payload.activeInference.status === 'finished') {
                delete inferences[action.payload.taskID];
            } else {
                inferences[action.payload.taskID] = action.payload.activeInference;
            }

            return {
                ...state,
                inferences: { ...inferences },
            };
        }
        case ModelsActionTypes.GET_INFERENCE_STATUS_FAILED: {
            const { inferences } = state;
            delete inferences[action.payload.taskID];

            return {
                ...state,
                inferences: { ...inferences },
            };
        }
        case ModelsActionTypes.CANCEL_INFERENCE_SUCCESS: {
            const { inferences } = state;
            delete inferences[action.payload.taskID];

            return {
                ...state,
                inferences: { ...inferences },
            };
        }
        case BoundariesActionTypes.RESET_AFTER_ERROR:
        case AuthActionTypes.LOGOUT_SUCCESS: {
            return { ...defaultState };
        }
        default: {
            return state;
        }
    }
}
