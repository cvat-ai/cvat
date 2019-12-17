import { AnyAction, Dispatch, ActionCreator } from 'redux';
import { ThunkAction } from 'redux-thunk';
import { SupportedPlugins } from '../reducers/interfaces';
import PluginChecker from '../utils/plugin-checker';

export enum PluginsActionTypes {
    CHECK_PLUGINS = 'CHECK_PLUGINS',
    CHECKED_ALL_PLUGINS = 'CHECKED_ALL_PLUGINS'
}

interface PluginObjects {
    [plugin: string]: boolean;
}

function checkPlugins(): AnyAction {
    const action = {
        type: PluginsActionTypes.CHECK_PLUGINS,
        payload: {},
    };

    return action;
}

function checkedAllPlugins(plugins: PluginObjects): AnyAction {
    const action = {
        type: PluginsActionTypes.CHECKED_ALL_PLUGINS,
        payload: {
            plugins,
        },
    };

    return action;
}

export function checkPluginsAsync():
ThunkAction<Promise<void>, {}, {}, AnyAction> {
    return async (dispatch: ActionCreator<Dispatch>): Promise<void> => {
        dispatch(checkPlugins());
        const plugins: PluginObjects = {};

        const promises: Promise<boolean>[] = [];
        const keys = Object.keys(SupportedPlugins);
        for (const key of keys) {
            const plugin = SupportedPlugins[key as any];
            promises.push(PluginChecker.check(plugin as SupportedPlugins));
        }

        const values = await Promise.all(promises);
        let i = 0;
        for (const key of keys) {
            plugins[key] = values[i++];
        }

        dispatch(checkedAllPlugins(plugins));
    };
}
