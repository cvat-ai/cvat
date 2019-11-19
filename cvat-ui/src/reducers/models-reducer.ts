import { AnyAction } from 'redux';

import { ModelsActionTypes } from '../actions/models-actions';
import { ModelsState } from './interfaces';

const defaultState: ModelsState = {
    initialized: false,
    fetchingError: null,
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
                isAdmin: action.payload.isAdmin,
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
        default: {
            return {
                ...state,
            };
        }
    }
}
