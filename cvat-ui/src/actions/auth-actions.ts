import { AnyAction, Dispatch, ActionCreator } from 'redux';
import { ThunkAction } from 'redux-thunk';

import getCore from '../core';

const cvat = getCore();

export enum AuthActionTypes {
    AUTHORIZED_SUCCESS = 'AUTHORIZED_SUCCESS',
    AUTHORIZED_FAILED = 'AUTHORIZED_FAILED',
    LOGIN_SUCCESS = 'LOGIN_SUCCESS',
    LOGIN_FAILED = 'LOGIN_FAILED',
    REGISTER_SUCCESS = 'REGISTER_SUCCESS',
    REGISTER_FAILED = 'REGISTER_FAILED',
    LOGOUT_SUCCESS = 'LOGOUT_SUCCESS',
    LOGOUT_FAILED = 'LOGOUT_FAILED',
}

export function registerSuccess(user: any): AnyAction {
    return {
        type: AuthActionTypes.REGISTER_SUCCESS,
        payload: {
            user,
        },
    };
}

export function registerFailed(registerError: any): AnyAction {
    return {
        type: AuthActionTypes.REGISTER_FAILED,
        payload: {
            registerError,
        },
    };
}

export function loginSuccess(user: any): AnyAction {
    return {
        type: AuthActionTypes.LOGIN_SUCCESS,
        payload: {
            user,
        },
    };
}

export function loginFailed(loginError: any): AnyAction {
    return {
        type: AuthActionTypes.LOGIN_FAILED,
        payload: {
            loginError,
        },
    };
}

export function logoutSuccess(): AnyAction {
    return {
        type: AuthActionTypes.LOGOUT_SUCCESS,
        payload: {},
    };
}

export function logoutFailed(logoutError: any): AnyAction {
    return {
        type: AuthActionTypes.LOGOUT_FAILED,
        payload: {
            logoutError,
        },
    };
}

export function authorizedSuccess(user: any): AnyAction {
    return {
        type: AuthActionTypes.AUTHORIZED_SUCCESS,
        payload: {
            user,
        },
    };
}

export function authorizedFailed(authError: any): AnyAction {
    return {
        type: AuthActionTypes.AUTHORIZED_FAILED,
        payload: {
            authError,
        },
    };
}

export function registerAsync({
    username,
    firstName,
    lastName,
    email,
    password1,
    password2,
}: {
    username: string;
    firstName: string;
    lastName: string;
    email: string;
    password1: string;
    password2: string;
}): ThunkAction<Promise<void>, {}, {}, AnyAction> {
    return async (dispatch: ActionCreator<Dispatch>): Promise<void> => {
        let users = null;
        try {
            await cvat.server.register(username, firstName, lastName,
                email, password1, password2);
            users = await cvat.users.get({ self: true });
        } catch (error) {
            dispatch(registerFailed(error));
            return;
        }

        dispatch(registerSuccess(users[0]));
    };
}

export function loginAsync({ username, password }: {username: string; password: string}):
ThunkAction<Promise<void>, {}, {}, AnyAction> {
    return async (dispatch: ActionCreator<Dispatch>): Promise<void> => {
        let users = null;
        try {
            await cvat.server.login(username, password);
            users = await cvat.users.get({ self: true });
        } catch (error) {
            dispatch(loginFailed(error));
            return;
        }

        dispatch(loginSuccess(users[0]));
    };
}

export function logoutAsync(): ThunkAction<Promise<void>, {}, {}, AnyAction> {
    return async (dispatch: ActionCreator<Dispatch>): Promise<void> => {
        try {
            await cvat.server.logout();
        } catch (error) {
            dispatch(logoutFailed(error));
            return;
        }

        dispatch(logoutSuccess());
    };
}

export function authorizedAsync(): ThunkAction<Promise<void>, {}, {}, AnyAction> {
    return async (dispatch: ActionCreator<Dispatch>): Promise<void> => {
        let result = null;
        try {
            result = await cvat.server.authorized();
        } catch (error) {
            dispatch(authorizedFailed(error));
            return;
        }

        if (result) {
            const userInstance = (await cvat.users.get({ self: true }))[0];
            dispatch(authorizedSuccess(userInstance));
        } else {
            dispatch(authorizedSuccess(null));
        }
    };
}
