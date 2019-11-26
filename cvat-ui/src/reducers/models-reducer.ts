import { AnyAction } from 'redux';

import { ModelsActionTypes } from '../actions/models-actions';
import { ModelsState } from './interfaces';

const defaultState: ModelsState = {
    initialized: false,
    creatingStatus: '',
    creatingError: null,
    startingError: null,
    fetchingError: null,
    deletingErrors: {},
    models: [],
    visibleRunWindows: false,
    activeRunTask: null,
    runnings: [],
};

export default function (state = defaultState, action: AnyAction): ModelsState {
    switch (action.type) {
        case ModelsActionTypes.GET_MODELS: {
            return {
                ...state,
                fetchingError: null,
                initialized: false,
            };
        }
        case ModelsActionTypes.GET_MODELS_SUCCESS: {
            return {
                ...state,
                models: action.payload.models,
                initialized: true,
            };
        }
        case ModelsActionTypes.GET_MODELS_FAILED: {
            return {
                ...state,
                fetchingError: action.payload.error,
                initialized: true,
            };
        }
        case ModelsActionTypes.DELETE_MODEL: {
            const errors = { ...state.deletingErrors };
            delete errors[action.payload.id];
            return {
                ...state,
                deletingErrors: errors,
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
        case ModelsActionTypes.DELETE_MODEL_FAILED: {
            const errors = { ...state.deletingErrors };
            errors[action.payload.id] = action.payload.error;
            return {
                ...state,
                deletingErrors: errors,
            };
        }
        case ModelsActionTypes.CREATE_MODEL: {
            return {
                ...state,
                creatingError: null,
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
                creatingError: action.payload.error,
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
        case ModelsActionTypes.INFER_MODEL: {
            return {
                ...state,
                startingError: null,
            };
        }
        case ModelsActionTypes.INFER_MODEL_FAILED: {
            return {
                ...state,
                startingError: action.payload.error,
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
        default: {
            return {
                ...state,
            };
        }
    }
}
