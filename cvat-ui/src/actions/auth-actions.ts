// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import { ActionUnion, createAction, ThunkAction } from 'utils/redux';
import { UserConfirmation } from 'components/register-page/register-form';
import getCore from 'cvat-core-wrapper';
import isReachable from 'utils/url-checker';

const cvat = getCore();

export enum AuthActionTypes {
    AUTHORIZED_SUCCESS = 'AUTHORIZED_SUCCESS',
    AUTHORIZED_FAILED = 'AUTHORIZED_FAILED',
    LOGIN = 'LOGIN',
    LOGIN_SUCCESS = 'LOGIN_SUCCESS',
    LOGIN_FAILED = 'LOGIN_FAILED',
    REGISTER = 'REGISTER',
    REGISTER_SUCCESS = 'REGISTER_SUCCESS',
    REGISTER_FAILED = 'REGISTER_FAILED',
    LOGOUT = 'LOGOUT',
    LOGOUT_SUCCESS = 'LOGOUT_SUCCESS',
    LOGOUT_FAILED = 'LOGOUT_FAILED',
    CHANGE_PASSWORD = 'CHANGE_PASSWORD',
    CHANGE_PASSWORD_SUCCESS = 'CHANGE_PASSWORD_SUCCESS',
    CHANGE_PASSWORD_FAILED = 'CHANGE_PASSWORD_FAILED',
    SWITCH_CHANGE_PASSWORD_DIALOG = 'SWITCH_CHANGE_PASSWORD_DIALOG',
    REQUEST_PASSWORD_RESET = 'REQUEST_PASSWORD_RESET',
    REQUEST_PASSWORD_RESET_SUCCESS = 'REQUEST_PASSWORD_RESET_SUCCESS',
    REQUEST_PASSWORD_RESET_FAILED = 'REQUEST_PASSWORD_RESET_FAILED',
    RESET_PASSWORD = 'RESET_PASSWORD_CONFIRM',
    RESET_PASSWORD_SUCCESS = 'RESET_PASSWORD_CONFIRM_SUCCESS',
    RESET_PASSWORD_FAILED = 'RESET_PASSWORD_CONFIRM_FAILED',
    LOAD_AUTH_ACTIONS = 'LOAD_AUTH_ACTIONS',
    LOAD_AUTH_ACTIONS_SUCCESS = 'LOAD_AUTH_ACTIONS_SUCCESS',
    LOAD_AUTH_ACTIONS_FAILED = 'LOAD_AUTH_ACTIONS_FAILED',
}

export const authActions = {
    authorizeSuccess: (user: any) => createAction(AuthActionTypes.AUTHORIZED_SUCCESS, { user }),
    authorizeFailed: (error: any) => createAction(AuthActionTypes.AUTHORIZED_FAILED, { error }),
    login: () => createAction(AuthActionTypes.LOGIN),
    loginSuccess: (user: any) => createAction(AuthActionTypes.LOGIN_SUCCESS, { user }),
    loginFailed: (error: any) => createAction(AuthActionTypes.LOGIN_FAILED, { error }),
    register: () => createAction(AuthActionTypes.REGISTER),
    registerSuccess: (user: any) => createAction(AuthActionTypes.REGISTER_SUCCESS, { user }),
    registerFailed: (error: any) => createAction(AuthActionTypes.REGISTER_FAILED, { error }),
    logout: () => createAction(AuthActionTypes.LOGOUT),
    logoutSuccess: () => createAction(AuthActionTypes.LOGOUT_SUCCESS),
    logoutFailed: (error: any) => createAction(AuthActionTypes.LOGOUT_FAILED, { error }),
    changePassword: () => createAction(AuthActionTypes.CHANGE_PASSWORD),
    changePasswordSuccess: () => createAction(AuthActionTypes.CHANGE_PASSWORD_SUCCESS),
    changePasswordFailed: (error: any) => createAction(AuthActionTypes.CHANGE_PASSWORD_FAILED, { error }),
    switchChangePasswordDialog: (showChangePasswordDialog: boolean) =>
        createAction(AuthActionTypes.SWITCH_CHANGE_PASSWORD_DIALOG, { showChangePasswordDialog }),
    requestPasswordReset: () => createAction(AuthActionTypes.REQUEST_PASSWORD_RESET),
    requestPasswordResetSuccess: () => createAction(AuthActionTypes.REQUEST_PASSWORD_RESET_SUCCESS),
    requestPasswordResetFailed: (error: any) => createAction(AuthActionTypes.REQUEST_PASSWORD_RESET_FAILED, { error }),
    resetPassword: () => createAction(AuthActionTypes.RESET_PASSWORD),
    resetPasswordSuccess: () => createAction(AuthActionTypes.RESET_PASSWORD_SUCCESS),
    resetPasswordFailed: (error: any) => createAction(AuthActionTypes.RESET_PASSWORD_FAILED, { error }),
    loadServerAuthActions: () => createAction(AuthActionTypes.LOAD_AUTH_ACTIONS),
    loadServerAuthActionsSuccess: (allowChangePassword: boolean, allowResetPassword: boolean) =>
        createAction(AuthActionTypes.LOAD_AUTH_ACTIONS_SUCCESS, {
            allowChangePassword,
            allowResetPassword,
        }),
    loadServerAuthActionsFailed: (error: any) => createAction(AuthActionTypes.LOAD_AUTH_ACTIONS_FAILED, { error }),
};

export type AuthActions = ActionUnion<typeof authActions>;

export const registerAsync = (
    username: string,
    firstName: string,
    lastName: string,
    email: string,
    password1: string,
    password2: string,
    confirmations: UserConfirmation[],
): ThunkAction => async (dispatch) => {
    dispatch(authActions.register());

    try {
        const user = await cvat.server.register(
            username,
            firstName,
            lastName,
            email,
            password1,
            password2,
            confirmations,
        );

        dispatch(authActions.registerSuccess(user));
    } catch (error) {
        dispatch(authActions.registerFailed(error));
    }
};

export const loginAsync = (username: string, password: string): ThunkAction => async (dispatch) => {
    dispatch(authActions.login());

    try {
        await cvat.server.login(username, password);
        const users = await cvat.users.get({ self: true });

        dispatch(authActions.loginSuccess(users[0]));
    } catch (error) {
        dispatch(authActions.loginFailed(error));
    }
};

export const logoutAsync = (): ThunkAction => async (dispatch) => {
    dispatch(authActions.logout());

    try {
        await cvat.server.logout();
        dispatch(authActions.logoutSuccess());
    } catch (error) {
        dispatch(authActions.logoutFailed(error));
    }
};

export const authorizedAsync = (): ThunkAction => async (dispatch) => {
    try {
        const result = await cvat.server.authorized();

        if (result) {
            const userInstance = (await cvat.users.get({ self: true }))[0];
            dispatch(authActions.authorizeSuccess(userInstance));
        } else {
            dispatch(authActions.authorizeSuccess(null));
        }
    } catch (error) {
        dispatch(authActions.authorizeFailed(error));
    }
};

export const changePasswordAsync = (
    oldPassword: string,
    newPassword1: string,
    newPassword2: string,
): ThunkAction => async (dispatch) => {
    dispatch(authActions.changePassword());

    try {
        await cvat.server.changePassword(oldPassword, newPassword1, newPassword2);
        dispatch(authActions.changePasswordSuccess());
    } catch (error) {
        dispatch(authActions.changePasswordFailed(error));
    }
};

export const requestPasswordResetAsync = (email: string): ThunkAction => async (dispatch) => {
    dispatch(authActions.requestPasswordReset());

    try {
        await cvat.server.requestPasswordReset(email);
        dispatch(authActions.requestPasswordResetSuccess());
    } catch (error) {
        dispatch(authActions.requestPasswordResetFailed(error));
    }
};

export const resetPasswordAsync = (
    newPassword1: string,
    newPassword2: string,
    uid: string,
    token: string,
): ThunkAction => async (dispatch) => {
    dispatch(authActions.resetPassword());

    try {
        await cvat.server.resetPassword(newPassword1, newPassword2, uid, token);
        dispatch(authActions.resetPasswordSuccess());
    } catch (error) {
        dispatch(authActions.resetPasswordFailed(error));
    }
};

export const loadAuthActionsAsync = (): ThunkAction => async (dispatch) => {
    dispatch(authActions.loadServerAuthActions());

    try {
        const promises: Promise<boolean>[] = [
            isReachable(`${cvat.config.backendAPI}/auth/password/change`, 'OPTIONS'),
            isReachable(`${cvat.config.backendAPI}/auth/password/reset`, 'OPTIONS'),
        ];
        const [allowChangePassword, allowResetPassword] = await Promise.all(promises);

        dispatch(authActions.loadServerAuthActionsSuccess(allowChangePassword, allowResetPassword));
    } catch (error) {
        dispatch(authActions.loadServerAuthActionsFailed(error));
    }
};
