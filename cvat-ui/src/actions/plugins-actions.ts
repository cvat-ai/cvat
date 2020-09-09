// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import { ActionUnion, createAction, ThunkAction } from 'utils/redux';
import { SupportedPlugins } from 'reducers/interfaces';
import PluginChecker from 'utils/plugin-checker';

export enum PluginsActionTypes {
    CHECK_PLUGINS = 'CHECK_PLUGINS',
    CHECKED_ALL_PLUGINS = 'CHECKED_ALL_PLUGINS',
}

type PluginObjects = Record<SupportedPlugins, boolean>;

const pluginActions = {
    checkPlugins: () => createAction(PluginsActionTypes.CHECK_PLUGINS),
    checkedAllPlugins: (list: PluginObjects) => (
        createAction(PluginsActionTypes.CHECKED_ALL_PLUGINS, {
            list,
        })
    ),
};

export type PluginActions = ActionUnion<typeof pluginActions>;

export function checkPluginsAsync(): ThunkAction {
    return async (dispatch): Promise<void> => {
        dispatch(pluginActions.checkPlugins());
        const plugins: PluginObjects = {
            ANALYTICS: false,
            GIT_INTEGRATION: false,
        };

        const promises: Promise<boolean>[] = [
            // check must return true/false with no exceptions
            PluginChecker.check(SupportedPlugins.ANALYTICS),
            PluginChecker.check(SupportedPlugins.GIT_INTEGRATION),
        ];

        const values = await Promise.all(promises);
        [plugins.ANALYTICS, plugins.GIT_INTEGRATION] = values;
        dispatch(pluginActions.checkedAllPlugins(plugins));
    };
}
