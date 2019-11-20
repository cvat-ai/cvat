import { AnyAction } from 'redux';

import { ModelsActionTypes } from '../actions/models-actions';
import { ModelsState } from './interfaces';

const defaultState: ModelsState = {
    initialized: false,
    fetchingError: null,
    deletingErrors: {},
    models: [],
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
        default: {
            return {
                ...state,
            };
        }
    }
}
