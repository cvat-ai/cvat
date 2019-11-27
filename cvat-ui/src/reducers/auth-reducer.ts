import { AnyAction } from 'redux';
import { AuthActionTypes } from '../actions/auth-actions';

import { AuthState } from './interfaces';

const defaultState: AuthState = {
    initialized: false,
    user: null,
};

export default (state = defaultState, action: AnyAction): AuthState => {
    switch (action.type) {
        case AuthActionTypes.AUTHORIZED_SUCCESS:
            return {
                ...state,
                initialized: true,
                user: action.payload.user,
            };
        case AuthActionTypes.LOGIN_SUCCESS:
            return {
                ...state,
                user: action.payload.user,
            };
        case AuthActionTypes.LOGOUT_SUCCESS:
            return {
                ...state,
                user: null,
            };
        case AuthActionTypes.REGISTER_SUCCESS:
            return {
                ...state,
                user: action.payload.user,
            };
        default:
            return state;
    }
};
