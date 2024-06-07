// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) 2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { getCore } from 'cvat-core-wrapper';
import { CanvasVersion } from 'cvat-canvas-wrapper';
import { AboutActions, AboutActionTypes } from 'actions/about-actions';
import { AboutState } from '.';
import pjson from '../../package.json';

const defaultState: AboutState = {
    server: {},
    packageVersion: {
        core: getCore().client.version,
        canvas: CanvasVersion,
        ui: pjson.version,
    },
    fetching: false,
    initialized: false,
};

export default function (
    state: AboutState = defaultState,
    action: AboutActions,
): AboutState {
    switch (action.type) {
        case AboutActionTypes.GET_ABOUT: {
            return {
                ...state,
                fetching: true,
                initialized: false,
            };
        }
        case AboutActionTypes.GET_ABOUT_SUCCESS:
            return {
                ...state,
                fetching: false,
                initialized: true,
                server: action.payload.server,
            };
        case AboutActionTypes.GET_ABOUT_FAILED:
            return {
                ...state,
                fetching: false,
                initialized: true,
            };
        default:
            return state;
    }
}
