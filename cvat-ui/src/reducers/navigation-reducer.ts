// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { NavigationActions, NavigationActionTypes } from 'actions/navigation-actions';
import config from 'config';
import { NavigationState } from '.';

const defaultState: NavigationState = {
    prevLocation: null,
};

export default function (
    state: NavigationState = defaultState,
    action:NavigationActions,
): NavigationState {
    switch (action.type) {
        case NavigationActionTypes.CHANGE_LOCATION: {
            const { BLACKLISTED_GO_BACK_PATHS } = config;
            const { from, to } = action.payload;

            if (from === to) {
                return state;
            }

            for (const path of BLACKLISTED_GO_BACK_PATHS) {
                if (path.test(from)) {
                    return {
                        ...state,
                        prevLocation: null,
                    };
                }
            }

            return {
                ...state,
                prevLocation: from,
            };
        }
        default:
            return state;
    }
}
