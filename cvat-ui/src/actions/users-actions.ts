// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import { ActionUnion, createAction, ThunkAction } from 'utils/redux';
import getCore from 'cvat-core';

const core = getCore();

export enum UsersActionTypes {
    GET_USERS = 'GET_USERS',
    GET_USERS_SUCCESS = 'GET_USERS_SUCCESS',
    GET_USERS_FAILED = 'GET_USERS_FAILED',
}

const usersActions = {
    getUsers: () => createAction(UsersActionTypes.GET_USERS),
    getUsersSuccess: (users: any[]) => createAction(UsersActionTypes.GET_USERS_SUCCESS, { users }),
    getUsersFailed: (error: any) => createAction(UsersActionTypes.GET_USERS_FAILED, { error }),
};

export type UsersActions = ActionUnion<typeof usersActions>;

export function getUsersAsync(): ThunkAction {
    return async (dispatch): Promise<void> => {
        dispatch(usersActions.getUsers());

        try {
            const users = await core.users.get();
            const wrappedUsers = users
                .map((userData: any): any => new core.classes.User(userData));
            dispatch(usersActions.getUsersSuccess(wrappedUsers));
        } catch (error) {
            dispatch(usersActions.getUsersFailed(error));
        }
    };
}
