import { AboutActions, AboutActionTypes } from 'actions/about-actions';
import { AuthActions, AuthActionTypes } from 'actions/auth-actions';
import { AboutState } from './interfaces';


const defaultState: AboutState = {
    server: {},
    fetching: false,
    initialized: false,
};

export default function (
    state: AboutState = defaultState,
    action: AboutActions | AuthActions,
): AboutState {
    switch (action.type) {
        case AboutActionTypes.GET_ABOUT: {
            return {
                ...state,
                fetching: true,
                initialized: false,
            };
        }
        case AboutActionTypes.GET_ABOUT_SUCCESS:
            return {
                ...state,
                fetching: false,
                initialized: true,
                server: action.payload.server,
            };
        case AboutActionTypes.GET_ABOUT_FAILED:
            return {
                ...state,
                fetching: false,
                initialized: true,
            };
        case AuthActionTypes.LOGOUT_SUCCESS: {
            return {
                ...defaultState,
            };
        }
        default:
            return state;
    }
}
