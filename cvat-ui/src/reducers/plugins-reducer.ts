import { AnyAction } from 'redux';

import { PluginsActionTypes } from '../actions/plugins-actions';

import {
    PluginsState,
} from './interfaces';

const defaultState: PluginsState = {
    initialized: false,
    plugins: {
        GIT_INTEGRATION: false,
        AUTO_ANNOTATION: false,
        TF_ANNOTATION: false,
        ANALYTICS: false,
    },
};

export default function (state = defaultState, action: AnyAction): PluginsState {
    switch (action.type) {
        case PluginsActionTypes.CHECKED_ALL_PLUGINS: {
            const { plugins } = action.payload;
            return {
                ...state,
                initialized: true,
                plugins,
            };
        }
        default:
            return { ...state };
    }
}
