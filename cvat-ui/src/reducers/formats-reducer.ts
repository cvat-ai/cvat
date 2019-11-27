import { AnyAction } from 'redux';
import { FormatsActionTypes } from '../actions/formats-actions';

import { FormatsState } from './interfaces';

const defaultState: FormatsState = {
    annotationFormats: [],
    datasetFormats: [],
    initialized: false,
};

export default (state = defaultState, action: AnyAction): FormatsState => {
    switch (action.type) {
        case FormatsActionTypes.GETTING_FORMATS_SUCCESS:
            return {
                ...state,
                initialized: true,
                annotationFormats: action.payload.annotationFormats,
                datasetFormats: action.payload.datasetFormats,
            };
        case FormatsActionTypes.GETTING_FORMATS_FAILED:
            return {
                ...state,
                initialized: true,
            };
        default:
            return state;
    }
};
