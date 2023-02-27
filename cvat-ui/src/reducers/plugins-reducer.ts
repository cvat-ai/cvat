// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { PluginsActionTypes, PluginActions } from 'actions/plugins-actions';
import { registerGitPlugin } from 'utils/git-utils';
import { PluginsState } from '.';

const defaultState: PluginsState = {
    fetching: false,
    initialized: false,
    list: {
        GIT_INTEGRATION: false,
        ANALYTICS: false,
        MODELS: false,
    },
    components: {
        loginPage: {
            loginForm: [],
        },
        router: [],
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
        case PluginsActionTypes.ADD_UI_COMPONENT: {
            const { path, component, data } = action.payload;
            const pathSegments = path.split('.');
            const updatedState = {
                ...state,
                components: { ...state.components },
            };

            let updatedStateSegment: any = updatedState.components;
            // let stateSegment: any = state.components;
            for (const pathSegment of pathSegments) {
                if (Array.isArray(updatedStateSegment[pathSegment])) {
                    updatedStateSegment[pathSegment] = [...updatedStateSegment[pathSegment]];
                } else {
                    updatedStateSegment[pathSegment] = { ...updatedStateSegment[pathSegment] };
                }
                updatedStateSegment = updatedStateSegment[pathSegment];
                // stateSegment = stateSegment[pathSegment];
                if (typeof updatedStateSegment === 'undefined') {
                    throw new Error('Could not add plugin component. Path is not supported by the core application');
                }
            }

            if (!Array.isArray(updatedStateSegment)) {
                throw new Error('Could not add plugin component. Target path is not array');
            }

            updatedStateSegment.push({
                component,
                data: {
                    weight: data.weight || Number.MAX_SAFE_INTEGER,
                    shouldBeRendered: data.shouldBeRendered || (() => true),
                },
            });

            return updatedState;
        }
        case PluginsActionTypes.REMOVE_UI_COMPONENT: {
            // TODO: finish
            return state;
        }
        default:
            return state;
    }
}
