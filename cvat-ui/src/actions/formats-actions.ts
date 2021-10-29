// Copyright (C) 2020-2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

import { ActionUnion, createAction, ThunkAction } from 'utils/redux';
import getCore from 'cvat-core-wrapper';

const cvat = getCore();

export enum FormatsActionTypes {
    GET_FORMATS = 'GET_FORMATS',
    GET_FORMATS_SUCCESS = 'GET_FORMATS_SUCCESS',
    GET_FORMATS_FAILED = 'GET_FORMATS_FAILED',
}

const formatsActions = {
    getFormats: () => createAction(FormatsActionTypes.GET_FORMATS),
    getFormatsSuccess: (annotationFormats: any) => (
        createAction(FormatsActionTypes.GET_FORMATS_SUCCESS, {
            annotationFormats,
        })
    ),
    getFormatsFailed: (error: any) => createAction(FormatsActionTypes.GET_FORMATS_FAILED, { error }),
};

export type FormatsActions = ActionUnion<typeof formatsActions>;

export function getFormatsAsync(): ThunkAction {
    return async (dispatch): Promise<void> => {
        dispatch(formatsActions.getFormats());
        let annotationFormats = null;

        try {
            annotationFormats = await cvat.server.formats();

            dispatch(formatsActions.getFormatsSuccess(annotationFormats));
        } catch (error) {
            dispatch(formatsActions.getFormatsFailed(error));
        }
    };
}
