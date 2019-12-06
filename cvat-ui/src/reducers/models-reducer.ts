import { AnyAction } from 'redux';

import { ModelsActionTypes } from '../actions/models-actions';
import { AuthActionTypes } from '../actions/auth-actions';
import { ModelsState } from './interfaces';

const defaultState: ModelsState = {
    initialized: false,
    fetching: false,
    creatingStatus: '',
    models: [],
    visibleRunWindows: false,
    activeRunTask: null,
    inferences: {},
};

export default function (state = defaultState, action: AnyAction): ModelsState {
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
        case ModelsActionTypes.GET_INFERENCE_STATUS_SUCCESS: {
            const inferences = { ...state.inferences };
            if (action.payload.activeInference.status === 'finished') {
                delete inferences[action.payload.taskID];
            } else {
                inferences[action.payload.taskID] = action.payload.activeInference;
            }

            return {
                ...state,
                inferences,
            };
        }
        case ModelsActionTypes.GET_INFERENCE_STATUS_FAILED: {
            const inferences = { ...state.inferences };
            delete inferences[action.payload.taskID];

            return {
                ...state,
                inferences,
            };
        }
        case AuthActionTypes.LOGOUT_SUCCESS: {
            return {
                ...defaultState,
            };
        }
        default: {
            return {
                ...state,
            };
        }
    }
}
