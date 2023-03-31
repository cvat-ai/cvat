// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) 2022-2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { BoundariesActions, BoundariesActionTypes } from 'actions/boundaries-actions';
import { ModelsActionTypes, ModelsActions } from 'actions/models-actions';
import { AuthActionTypes, AuthActions } from 'actions/auth-actions';
import { MLModel, ModelKind } from 'cvat-core-wrapper';
import { ModelsState } from '.';

const defaultState: ModelsState = {
    initialized: false,
    fetching: false,
    creatingStatus: '',
    interactors: [],
    detectors: [],
    trackers: [],
    reid: [],
    classifiers: [],
    modelRunnerIsVisible: false,
    modelRunnerTask: null,
    inferences: {},
    totalCount: 0,
    query: {
        page: 1,
        id: null,
        search: null,
        filter: null,
        sort: null,
    },
    providers: {
        fetching: false,
        list: [],
    },
    previews: {},
};

export default function (state = defaultState, action: ModelsActions | AuthActions | BoundariesActions): ModelsState {
    switch (action.type) {
        case ModelsActionTypes.GET_MODELS: {
            return {
                ...state,
                fetching: true,
                query: {
                    ...state.query,
                    ...action.payload.query,
                },
            };
        }
        case ModelsActionTypes.GET_MODELS_SUCCESS: {
            return {
                ...state,
                interactors: action.payload.models.filter((model: MLModel) => (
                    model.kind === ModelKind.INTERACTOR
                )),
                detectors: action.payload.models.filter((model: MLModel) => (
                    model.kind === ModelKind.DETECTOR
                )),
                trackers: action.payload.models.filter((model: MLModel) => (
                    model.kind === ModelKind.TRACKER
                )),
                reid: action.payload.models.filter((model: MLModel) => (
                    model.kind === ModelKind.REID
                )),
                classifiers: action.payload.models.filter((model: MLModel) => (
                    model.kind === ModelKind.CLASSIFIER
                )),
                totalCount: action.payload.count,
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
        case ModelsActionTypes.CREATE_MODEL: {
            return {
                ...state,
                fetching: true,
            };
        }
        case ModelsActionTypes.CREATE_MODEL_FAILED: {
            return {
                ...state,
                fetching: false,
            };
        }
        case ModelsActionTypes.CREATE_MODEL_SUCCESS: {
            const mutual = {
                ...state,
                fetching: false,
            };

            if (action.payload.model.kind === ModelKind.REID) {
                return {
                    ...mutual,
                    reid: [...state.reid, action.payload.model],
                };
            }

            return {
                ...mutual,
                [`${action.payload.model.kind}s`]: [...state[`${action.payload.model.kind}s`], action.payload.model],
            };
        }
        case ModelsActionTypes.SHOW_RUN_MODEL_DIALOG: {
            return {
                ...state,
                modelRunnerIsVisible: true,
                modelRunnerTask: action.payload.taskInstance,
            };
        }
        case ModelsActionTypes.CLOSE_RUN_MODEL_DIALOG: {
            return {
                ...state,
                modelRunnerIsVisible: false,
                modelRunnerTask: null,
            };
        }
        case ModelsActionTypes.GET_INFERENCE_STATUS_SUCCESS: {
            const { inferences } = state;

            if (action.payload.activeInference.status === 'finished') {
                return {
                    ...state,
                    inferences: Object.fromEntries(
                        Object.entries(inferences).filter(([key]): boolean => +key !== action.payload.taskID),
                    ),
                };
            }

            const update: any = {};
            update[action.payload.taskID] = action.payload.activeInference;

            return {
                ...state,
                inferences: {
                    ...state.inferences,
                    ...update,
                },
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
        case ModelsActionTypes.GET_MODEL_PROVIDERS: {
            return {
                ...state,
                providers: {
                    ...state.providers,
                    fetching: true,
                },
            };
        }
        case ModelsActionTypes.GET_MODEL_PROVIDERS_SUCCESS: {
            return {
                ...state,
                providers: {
                    fetching: false,
                    list: action.payload.providers,
                },
            };
        }
        case ModelsActionTypes.GET_MODEL_PROVIDERS_FAILED: {
            return {
                ...state,
                providers: {
                    ...state.providers,
                    fetching: false,
                },
            };
        }
        case ModelsActionTypes.GET_MODEL_PREVIEW: {
            const { modelID } = action.payload;
            const { previews } = state;
            return {
                ...state,
                previews: {
                    ...previews,
                    [modelID]: {
                        preview: '',
                        fetching: true,
                        initialized: false,
                    },
                },
            };
        }
        case ModelsActionTypes.GET_MODEL_PREVIEW_SUCCESS: {
            const { modelID, preview } = action.payload;
            const { previews } = state;
            return {
                ...state,
                previews: {
                    ...previews,
                    [modelID]: {
                        preview,
                        fetching: false,
                        initialized: true,
                    },
                },
            };
        }
        case ModelsActionTypes.GET_MODEL_PREVIEW_FAILED: {
            const { modelID } = action.payload;
            const { previews } = state;
            return {
                ...state,
                previews: {
                    ...previews,
                    [modelID]: {
                        ...previews[modelID],
                        fetching: false,
                        initialized: true,
                    },
                },
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
