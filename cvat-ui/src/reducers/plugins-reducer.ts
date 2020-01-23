import { AnyAction } from 'redux';

import { PluginsActionTypes } from 'actions/plugins-actions';
import { AuthActionTypes } from 'actions/auth-actions';
import { registerGitPlugin } from 'utils/git-utils';
import {
    PluginsState,
} from './interfaces';


const defaultState: PluginsState = {
    fetching: false,
    initialized: false,
    list: {
        GIT_INTEGRATION: false,
        AUTO_ANNOTATION: false,
        TF_ANNOTATION: false,
        TF_SEGMENTATION: false,
        ANALYTICS: false,
    },
};
export default function (state = defaultState, action: AnyAction): PluginsState {
    switch (action.type) {
        case PluginsActionTypes.CHECK_PLUGINS: {
            return {
                ...state,
                initialized: false,
                fetching: true,
            };
        }
        case PluginsActionTypes.CHECKED_ALL_PLUGINS: {
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
        case AuthActionTypes.LOGOUT_SUCCESS: {
            return {
                ...defaultState,
            };
        }
        default:
            return state;
    }
}
