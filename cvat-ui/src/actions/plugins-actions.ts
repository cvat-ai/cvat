// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import { ActionUnion, createAction, ThunkAction } from 'utils/redux';
import { SupportedPlugins } from 'reducers/interfaces';
import PluginChecker from 'utils/plugin-checker';

export enum PluginsActionTypes {
    CHECK_PLUGINS = 'CHECK_PLUGINS',
    CHECKED_ALL_PLUGINS = 'CHECKED_ALL_PLUGINS'
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
            AUTO_ANNOTATION: false,
            GIT_INTEGRATION: false,
            TF_ANNOTATION: false,
            TF_SEGMENTATION: false,
        };

        const promises: Promise<boolean>[] = [
            PluginChecker.check(SupportedPlugins.ANALYTICS),
            PluginChecker.check(SupportedPlugins.AUTO_ANNOTATION),
            PluginChecker.check(SupportedPlugins.GIT_INTEGRATION),
            PluginChecker.check(SupportedPlugins.TF_ANNOTATION),
            PluginChecker.check(SupportedPlugins.TF_SEGMENTATION),
        ];

        const values = await Promise.all(promises);
        [plugins.ANALYTICS] = values;
        [, plugins.AUTO_ANNOTATION] = values;
        [,, plugins.GIT_INTEGRATION] = values;
        [,,, plugins.TF_ANNOTATION] = values;
        [,,,, plugins.TF_SEGMENTATION] = values;

        dispatch(pluginActions.checkedAllPlugins(plugins));
    };
}
