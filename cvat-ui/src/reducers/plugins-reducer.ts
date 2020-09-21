// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import { PluginsActionTypes, PluginActions } from 'actions/plugins-actions';
import { registerGitPlugin } from 'utils/git-utils';
import { PluginsState } from './interfaces';

const defaultState: PluginsState = {
    fetching: false,
    initialized: false,
    plugins: {
        GIT_INTEGRATION: false,
        ANALYTICS: false,
        MODELS: false,
    },
};

export default function (
    state: PluginsState = defaultState,
    action: PluginActions,
): PluginsState {
    switch (action.type) {
        case PluginsActionTypes.GET_PLUGINS: {
            return {
                ...state,
                initialized: false,
                fetching: true,
            };
        }
        case PluginsActionTypes.GET_PLUGINS_SUCCESS: {
            const { plugins } = action.payload;

            if (!state.plugins.GIT_INTEGRATION && plugins.GIT_INTEGRATION) {
                registerGitPlugin();
            }

            return {
                ...state,
                initialized: true,
                fetching: false,
                plugins,
            };
        }
        case PluginsActionTypes.GET_PLUGINS_FAILED: {
            return {
                ...state,
                initialized: true,
                fetching: false,
            };
        }
        default:
            return state;
    }
}
