import { AnyAction } from 'redux';
import { FormatsActionTypes } from '../actions/formats-actions';

import { FormatsState } from './interfaces';

const defaultState: FormatsState = {
    loaders: [],
    dumpers: [],
    gettingFormatsError: null,
    initialized: false,
};

export default (state = defaultState, action: AnyAction): FormatsState => {
    switch (action.type) {
        case FormatsActionTypes.GETTING_FORMATS_SUCCESS:
            return {
                ...state,
                initialized: true,
                gettingFormatsError: null,
                dumpers: action.payload.formats.map((format: any): any[] => format.dumpers).flat(),
                loaders: action.payload.formats.map((format: any): any[] => format.loaders).flat(),
            };
        case FormatsActionTypes.GETTING_FORMATS_FAILED:
            return {
                ...state,
                initialized: true,
                gettingFormatsError: action.payload.error,
            };
        default:
            return state;
    }
};
