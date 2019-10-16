import { AnyAction, Dispatch, ActionCreator } from 'redux';
import { ThunkAction } from 'redux-thunk';

import getCore from '../core';

const cvat = getCore();

export enum AnnotationActionTypes {
    GETTING_FORMATS_SUCCESS = 'GETTING_FORMATS_SUCCESS',
    GETTING_FORMATS_FAILED = 'GETTING_FORMATS_FAILED',
    UPLOAD_ANNOTATIONS = 'UPLOAD_ANNOTATIONS',
    UPLOAD_ANNOTATIONS_SUCCESS = 'UPLOAD_ANNOTATIONS_SUCCESS',
    UPLOAD_ANNOTATIONS_FAILED = 'UPLOAD_ANNOTATIONS_FAILED',
    DUMP_ANNOTATIONS = 'DUMP_ANNOTATIONS',
    DUMP_ANNOTATIONS_SUCCESS = 'DUMP_ANNOTATIONS_SUCCESS',
    DUMP_ANNOTATIONS_FAILED = 'DUMP_ANNOTATIONS_FAILED',
}

export function gettingFormatsSuccess(formats: any): AnyAction {
    return {
        type: AnnotationActionTypes.GETTING_FORMATS_SUCCESS,
        payload: {
            formats,
        },
    };
}

export function gettingFormatsFailed(error: any): AnyAction {
    return {
        type: AnnotationActionTypes.GETTING_FORMATS_FAILED,
        payload: {
            error,
        },
    };
}

export function gettingFormatsAsync(): ThunkAction<Promise<void>, {}, {}, AnyAction> {
    return async (dispatch: ActionCreator<Dispatch>): Promise<void> => {
        let formats = null;
        try {
            formats = await cvat.server.formats();
        } catch (error) {
            dispatch(gettingFormatsFailed(error));
            return;
        }

        dispatch(gettingFormatsSuccess(formats));
    };
}
