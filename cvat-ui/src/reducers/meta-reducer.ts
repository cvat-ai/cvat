import { MetaState } from './interfaces';
import { AuthActionTypes } from '../actions/auth-actions';
import { boundariesActions, BoundariesActionTypes } from '../actions/boundaries-actions';
import { AllowedAppsActions, MetaActionTypes } from '../actions/meta-action';

const defaultState: MetaState = {
    initialized: false,
    fetching: false,
    showTasksButton: false,
    showAnalyticsButton: false,
    showModelsButton: false,
};

export default function (
    state: MetaState = defaultState,
    action: AllowedAppsActions | AuthActionTypes | boundariesActions,
): MetaState {
    switch (action.type) {
        case MetaActionTypes.GET_ALLOWED_APPS: {
            return {
                ...state,
                initialized: false,
                fetching: true,
            };
        }
        case MetaActionTypes.GET_ALLOWED_APPS_SUCCESS:
            return {
                ...state,
                ...action.payload.data,
                initialized: true,
                fetching: false,
            };
        case MetaActionTypes.GET_ALLOWED_APPS_FAILED:
            return {
                ...state,
                initialized: true,
                fetching: false,
            };
        case BoundariesActionTypes.RESET_AFTER_ERROR:
        case AuthActionTypes.LOGOUT_SUCCESS: {
            return {...defaultState};
        }
        default:
            return state;
    }
}