// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { ActionUnion, createAction, ThunkAction } from 'utils/redux';
import { PluginsList } from 'reducers';
import { getCore } from 'cvat-core-wrapper';
import React from 'react';

const core = getCore();

export enum PluginsActionTypes {
    GET_PLUGINS = 'GET_PLUGINS',
    GET_PLUGINS_SUCCESS = 'GET_PLUGINS_SUCCESS',
    GET_PLUGINS_FAILED = 'GET_PLUGINS_FAILED',
    ADD_PLUGIN = 'ADD_PLUGIN',
    ADD_UI_COMPONENT = 'ADD_UI_COMPONENT',
    REMOVE_UI_COMPONENT = 'REMOVE_UI_COMPONENT',
}

export const pluginActions = {
    checkPlugins: () => createAction(PluginsActionTypes.GET_PLUGINS),
    checkPluginsSuccess: (list: PluginsList) => createAction(
        PluginsActionTypes.GET_PLUGINS_SUCCESS, { list },
    ),
    checkPluginsFailed: (error: any) => createAction(PluginsActionTypes.GET_PLUGINS_FAILED, { error }),
    addPlugin: (name: string, destructor: CallableFunction, globalStateDidUpdate?: CallableFunction) => createAction(
        PluginsActionTypes.ADD_PLUGIN, { name, destructor, globalStateDidUpdate },
    ),
    addUIComponent: (
        path: string,
        component: React.Component,
        data: {
            weight?: number;
            shouldBeRendered?: (props?: object, state?: object) => boolean;
        } = {},
    ) => createAction(PluginsActionTypes.ADD_UI_COMPONENT, { path, component, data }),
    removeUIComponent: (path: string, component: React.Component) => createAction(
        PluginsActionTypes.REMOVE_UI_COMPONENT, { path, component },
    ),
};

export type PluginActions = ActionUnion<typeof pluginActions>;

export const getPluginsAsync = (): ThunkAction => async (dispatch): Promise<void> => {
    dispatch(pluginActions.checkPlugins());
    try {
        const list: PluginsList = await core.server.installedApps();
        dispatch(pluginActions.checkPluginsSuccess(list));
    } catch (error) {
        dispatch(pluginActions.checkPluginsFailed(error));
    }
};
