import { AnyAction, Dispatch, ActionCreator } from 'redux';
import { ThunkAction } from 'redux-thunk';
import _cvat from '../../../cvat-core/dist/cvat-core.node';

const cvat: any = _cvat;

export enum AuthActionTypes {
    AUTHORIZED_ASYNC = 'AUTHORIZED_ASYNC',
    AUTHORIZED_FETCHING = 'AUTHORIZED_FETCHING',
    AUTHORIZED_SUCCESS = 'AUTHORIZED_SUCCESS',
    AUTHORIZED_FAILED = 'AUTHORIZED_FAILED',
    LOGIN_SUCCESS = 'LOGIN_SUCCESS',
    LOGIN_FAILED = 'LOGIN_FAILED',
}

export function registerSuccess(user: any): AnyAction {

}

export function registerFailed(registerError: any): AnyAction {

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

export function loginAsync(login: string,
    password: string): ThunkAction<Promise<void>, {}, {}, AnyAction> {
    return async (dispatch: ActionCreator<Dispatch>): Promise<void> => {
        let user = null;
        try {
            await cvat.server.login(login, password);
            user = await cvat.users.get({ self: true });
        } catch (error) {
            dispatch(loginFailed(error));
            return;
        }

        dispatch(loginSuccess(user));
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
            const userInstance = await cvat.users.get({ self: true });
            dispatch(authorizedSuccess(userInstance));
        } else {
            dispatch(authorizedSuccess(null));
        }
    };
}
