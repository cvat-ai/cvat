// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) 2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { FormatsActionTypes, FormatsActions } from 'actions/formats-actions';

import { FormatsState } from '.';

const defaultState: FormatsState = {
    annotationFormats: null,
    initialized: false,
    fetching: false,
};

export default (
    state: FormatsState = defaultState,
    action: FormatsActions,
): FormatsState => {
    switch (action.type) {
        case FormatsActionTypes.GET_FORMATS: {
            return {
                ...state,
                fetching: true,
                initialized: false,
            };
        }
        case FormatsActionTypes.GET_FORMATS_SUCCESS:
            return {
                ...state,
                initialized: true,
                fetching: false,
                annotationFormats: action.payload.annotationFormats,
            };
        case FormatsActionTypes.GET_FORMATS_FAILED:
            return {
                ...state,
                initialized: true,
                fetching: false,
            };
        default:
            return state;
    }
};
