import { AnyAction } from 'redux';
import { AboutState } from './interfaces';

import { AuthActionTypes } from '../actions/auth-actions';
import { AboutActionTypes } from '../actions/about-actions';

const defaultState: AboutState = {
    server: {},
    fetching: false,
    initialized: false,
};

export default function (state: AboutState = defaultState, action: AnyAction): AboutState {
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
