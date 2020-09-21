// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import { ActionUnion, createAction, ThunkAction } from 'utils/redux';
import getCore from '../cvat-core-wrapper';

const core = getCore();

export enum PluginsActionTypes {
    GET_PLUGINS = 'GET_PLUGINS',
    GET_PLUGINS_SUCCESS = 'GET_PLUGINS_SUCCESS',
    GET_PLUGINS_FAILED = 'GET_PLUGINS_FAILED',
}

const pluginActions = {
    checkPlugins: () => createAction(PluginsActionTypes.GET_PLUGINS),
    checkPluginsSuccess: (plugins: any) => createAction(PluginsActionTypes.GET_PLUGINS_SUCCESS, {plugins}),
    checkPluginsFailed: (error: any) => createAction(PluginsActionTypes.GET_PLUGINS_FAILED, {error}),
};

export type PluginActions = ActionUnion<typeof pluginActions>;

export const getPluginsAsync = (): ThunkAction => async (dispatch): Promise<void> => {
    dispatch(pluginActions.checkPlugins());
    try {
        const plugins: string[] = await core.server.getPlugins();
        dispatch(pluginActions.checkPluginsSuccess(plugins));
    } catch (error) {
        dispatch(pluginActions.checkPluginsFailed(error));
    }
};
