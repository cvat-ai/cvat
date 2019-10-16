import { AnyAction } from 'redux';
import { AnnotationActionTypes } from '../actions/annotation-actions';

import { AnnotationState } from './interfaces';

const defaultState: AnnotationState = {
    loaders: [],
    dumpers: [],
    error: null,
    initialized: false,
};

export default (state = defaultState, action: AnyAction): AnnotationState => {
    switch (action.type) {
        case AnnotationActionTypes.GETTING_FORMATS_SUCCESS:
            return {
                ...state,
                initialized: true,
                error: null,
                dumpers: action.payload.formats.map((format: any): any[] => format.dumpers).flat(),
                loaders: action.payload.formats.map((format: any): any[] => format.loaders).flat(),
            };
        case AnnotationActionTypes.GETTING_FORMATS_FAILED:
            return {
                ...state,
                initialized: true,
                error: action.payload.error,
            };
        default:
            return state;
    }
};
