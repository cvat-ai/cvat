import { AnyAction } from 'redux';

import { AuthActionTypes } from '../actions/auth-actions';


export interface AuthState {
    initialized: boolean;
    error: string;
    user: any;
}

const defaultState: AuthState = {
    initialized: false,
    error: '',
    user: null,
};

export default (state = defaultState, action: AnyAction): AuthState => {
    switch (action.type) {
        case AuthActionTypes.AUTHORIZED_SUCCESS:
            return { ...state, initialized: true, user: action.payload.user };
        case AuthActionTypes.AUTHORIZED_FAILED:
            return { ...state, initialized: true, error: action.payload.error };
        default:
            return state;
    }
};
