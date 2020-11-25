// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import { PluginsActionTypes, PluginActions } from 'actions/plugins-actions';
import { registerGitPlugin } from 'utils/git-utils';
import { PluginsState } from './interfaces';

const defaultState: PluginsState = {
    fetching: false,
    initialized: false,
    list: {
        GIT_INTEGRATION: false,
        ANALYTICS: false,
        MODELS: false,
    },
};

export default function (state: PluginsState = defaultState, action: PluginActions): PluginsState {
    switch (action.type) {
        case PluginsActionTypes.GET_PLUGINS: {
            return {
                ...state,
                initialized: false,
                fetching: true,
            };
        }
        case PluginsActionTypes.GET_PLUGINS_SUCCESS: {
            const { list } = action.payload;

            if (!state.list.GIT_INTEGRATION && list.GIT_INTEGRATION) {
                registerGitPlugin();
            }

            return {
                ...state,
                initialized: true,
                fetching: false,
                list,
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
