// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import { ActionUnion, createAction, ThunkAction } from 'utils/redux';
import getCore from 'cvat-core';

const cvat = getCore();

export enum FormatsActionTypes {
    GET_FORMATS = 'GET_FORMATS',
    GET_FORMATS_SUCCESS = 'GET_FORMATS_SUCCESS',
    GET_FORMATS_FAILED = 'GET_FORMATS_FAILED',
}

const formatsActions = {
    getFormats: () => createAction(FormatsActionTypes.GET_FORMATS),
    getFormatsSuccess: (annotationFormats: any[], datasetFormats: any[]) => (
        createAction(FormatsActionTypes.GET_FORMATS_SUCCESS, {
            annotationFormats,
            datasetFormats,
        })
    ),
    getFormatsFailed: (error: any) => (
        createAction(FormatsActionTypes.GET_FORMATS_FAILED, { error })
    ),
};

export type FormatsActions = ActionUnion<typeof formatsActions>;

export function getFormatsAsync(): ThunkAction {
    return async (dispatch): Promise<void> => {
        dispatch(formatsActions.getFormats());
        let annotationFormats = null;
        let datasetFormats = null;

        try {
            annotationFormats = await cvat.server.formats();
            datasetFormats = await cvat.server.datasetFormats();

            dispatch(
                formatsActions.getFormatsSuccess(annotationFormats, datasetFormats),
            );
        } catch (error) {
            dispatch(formatsActions.getFormatsFailed(error));
        }
    };
}
