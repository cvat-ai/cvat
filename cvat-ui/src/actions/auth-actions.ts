// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { ActionUnion, createAction, ThunkAction } from 'utils/redux';
import { RegisterData } from 'components/register-page/register-form';
import { getCore, User } from 'cvat-core-wrapper';

const cvat = getCore();

export enum AuthActionTypes {
    AUTHENTICATED_REQUEST = 'AUTHENTICATED_REQUEST',
    AUTHENTICATED_SUCCESS = 'AUTHENTICATED_SUCCESS',
    AUTHENTICATED_FAILED = 'AUTHENTICATED_FAILED',
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
}

export const authActions = {
    authenticatedRequest: () => createAction(AuthActionTypes.AUTHENTICATED_REQUEST),
    authenticatedSuccess: (user: User | null) => createAction(AuthActionTypes.AUTHENTICATED_SUCCESS, { user }),
    authenticatedFailed: (error: any) => createAction(AuthActionTypes.AUTHENTICATED_FAILED, { error }),
    login: () => createAction(AuthActionTypes.LOGIN),
    loginSuccess: (user: User) => createAction(AuthActionTypes.LOGIN_SUCCESS, { user }),
    loginFailed: (error: any, hasEmailVerificationBeenSent = false) => (
        createAction(AuthActionTypes.LOGIN_FAILED, { error, hasEmailVerificationBeenSent })
    ),
    register: () => createAction(AuthActionTypes.REGISTER),
    registerSuccess: (user: User) => createAction(AuthActionTypes.REGISTER_SUCCESS, { user }),
    registerFailed: (error: any) => createAction(AuthActionTypes.REGISTER_FAILED, { error }),
    logout: () => createAction(AuthActionTypes.LOGOUT),
    logoutSuccess: () => createAction(AuthActionTypes.LOGOUT_SUCCESS),
    logoutFailed: (error: any) => createAction(AuthActionTypes.LOGOUT_FAILED, { error }),
    changePassword: () => createAction(AuthActionTypes.CHANGE_PASSWORD),
    changePasswordSuccess: () => createAction(AuthActionTypes.CHANGE_PASSWORD_SUCCESS),
    changePasswordFailed: (error: any) => createAction(AuthActionTypes.CHANGE_PASSWORD_FAILED, { error }),
    switchChangePasswordModalVisible: (visible: boolean) => (
        createAction(AuthActionTypes.SWITCH_CHANGE_PASSWORD_DIALOG, { visible })
    ),
    requestPasswordReset: () => createAction(AuthActionTypes.REQUEST_PASSWORD_RESET),
    requestPasswordResetSuccess: () => createAction(AuthActionTypes.REQUEST_PASSWORD_RESET_SUCCESS),
    requestPasswordResetFailed: (error: any) => createAction(AuthActionTypes.REQUEST_PASSWORD_RESET_FAILED, { error }),
    resetPassword: () => createAction(AuthActionTypes.RESET_PASSWORD),
    resetPasswordSuccess: () => createAction(AuthActionTypes.RESET_PASSWORD_SUCCESS),
    resetPasswordFailed: (error: any) => createAction(AuthActionTypes.RESET_PASSWORD_FAILED, { error }),
};

export type AuthActions = ActionUnion<typeof authActions>;

export const registerAsync = (
    registerData: RegisterData,
): ThunkAction => async (dispatch) => {
    dispatch(authActions.register());

    const {
        username,
        firstName,
        lastName,
        email,
        password,
        confirmations,
    } = registerData;

    try {
        const user = await cvat.server.register(
            username,
            firstName,
            lastName,
            email,
            password,
            confirmations,
        );

        dispatch(authActions.registerSuccess(user));
    } catch (error) {
        dispatch(authActions.registerFailed(error));
    }
};

export const loginAsync = (credential: string, password: string): ThunkAction => async (dispatch) => {
    dispatch(authActions.login());

    try {
        await cvat.server.login(credential, password);
        const users = await cvat.users.get({ self: true });
        dispatch(authActions.loginSuccess(users[0]));
    } catch (error) {
        const hasEmailVerificationBeenSent = error.message.includes('Unverified email');
        dispatch(authActions.loginFailed(error, hasEmailVerificationBeenSent));
    }
};

export const logoutAsync = (): ThunkAction => async (dispatch) => {
    dispatch(authActions.logout());

    try {
        await cvat.organizations.deactivate();
        await cvat.server.logout();
        dispatch(authActions.logoutSuccess());
    } catch (error) {
        dispatch(authActions.logoutFailed(error));
    }
};

export const authenticatedAsync = (): ThunkAction => async (dispatch) => {
    try {
        dispatch(authActions.authenticatedRequest());
        const result = await cvat.server.authenticated();
        if (result) {
            const userInstance = (await cvat.users.get({ self: true }))[0];
            dispatch(authActions.authenticatedSuccess(userInstance));
        } else {
            dispatch(authActions.authenticatedSuccess(null));
        }
    } catch (error) {
        dispatch(authActions.authenticatedFailed(error));
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
