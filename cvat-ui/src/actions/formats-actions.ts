import { AnyAction, Dispatch, ActionCreator } from 'redux';
import { ThunkAction } from 'redux-thunk';

import getCore from '../core';

const cvat = getCore();

export enum FormatsActionTypes {
    GET_FORMATS = 'GET_FORMATS',
    GET_FORMATS_SUCCESS = 'GET_FORMATS_SUCCESS',
    GET_FORMATS_FAILED = 'GET_FORMATS_FAILED',
}

function getFormats(): AnyAction {
    return {
        type: FormatsActionTypes.GET_FORMATS,
        payload: {},
    };
}

function getFormatsSuccess(
    annotationFormats: any[],
    datasetFormats: any[],
): AnyAction {
    return {
        type: FormatsActionTypes.GET_FORMATS_SUCCESS,
        payload: {
            annotationFormats,
            datasetFormats,
        },
    };
}

function getFormatsFailed(error: any): AnyAction {
    return {
        type: FormatsActionTypes.GET_FORMATS_FAILED,
        payload: {
            error,
        },
    };
}

export function getFormatsAsync(): ThunkAction<Promise<void>, {}, {}, AnyAction> {
    return async (dispatch: ActionCreator<Dispatch>): Promise<void> => {
        dispatch(getFormats());
        let annotationFormats = null;
        let datasetFormats = null;
        try {
            annotationFormats = await cvat.server.formats();
            datasetFormats = await cvat.server.datasetFormats();
        } catch (error) {
            dispatch(getFormatsFailed(error));
            return;
        }

        dispatch(getFormatsSuccess(annotationFormats, datasetFormats));
    };
}
