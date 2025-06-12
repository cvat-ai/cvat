// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { omit } from 'lodash';
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
    modelRunnerIsVisible: false,
    modelRunnerTask: null,
    requestedInferenceIDs: {},
    inferences: {},
    totalCount: 0,
    query: {
        page: 1,
        id: null,
        search: null,
        filter: null,
        sort: null,
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
        case ModelsActionTypes.GET_INFERENCES_SUCCESS: {
            const { requestedInferenceIDs } = state;

            return {
                ...state,
                requestedInferenceIDs: {
                    ...requestedInferenceIDs,
                    ...action.payload.requestedInferenceIDs,
                },
            };
        }
        case ModelsActionTypes.GET_INFERENCE_STATUS_SUCCESS: {
            const { inferences, requestedInferenceIDs } = state;

            if (action.payload.activeInference.status === 'finished') {
                const { taskID, activeInference } = action.payload;
                const { id: inferenceID } = activeInference;

                return {
                    ...state,
                    inferences: omit(inferences, taskID),
                    requestedInferenceIDs: omit(requestedInferenceIDs, inferenceID),
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

            return {
                ...state,
                inferences: {
                    ...inferences,
                    [action.payload.taskID]: action.payload.activeInference,
                },
            };
        }
        case ModelsActionTypes.CANCEL_INFERENCE_SUCCESS: {
            const { inferences, requestedInferenceIDs } = state;
            const { taskID, activeInference } = action.payload;
            const { id: inferenceID } = activeInference;

            return {
                ...state,
                inferences: omit(inferences, taskID),
                requestedInferenceIDs: omit(requestedInferenceIDs, inferenceID),
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
