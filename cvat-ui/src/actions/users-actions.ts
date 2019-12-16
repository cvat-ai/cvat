import { AnyAction, Dispatch, ActionCreator } from 'redux';
import { ThunkAction } from 'redux-thunk';

import getCore from '../core';

const core = getCore();

export enum UsersActionTypes {
    GET_USERS = 'GET_USERS',
    GET_USERS_SUCCESS = 'GET_USERS_SUCCESS',
    GET_USERS_FAILED = 'GET_USERS_FAILED',
}

function getUsers(): AnyAction {
    const action = {
        type: UsersActionTypes.GET_USERS,
        payload: {},
    };

    return action;
}

function getUsersSuccess(users: any[]): AnyAction {
    const action = {
        type: UsersActionTypes.GET_USERS_SUCCESS,
        payload: { users },
    };

    return action;
}

function getUsersFailed(error: any): AnyAction {
    const action = {
        type: UsersActionTypes.GET_USERS_FAILED,
        payload: { error },
    };

    return action;
}

export function getUsersAsync():
ThunkAction<Promise<void>, {}, {}, AnyAction> {
    return async (dispatch: ActionCreator<Dispatch>): Promise<void> => {
        dispatch(getUsers());

        try {
            const users = await core.users.get();
            dispatch(
                getUsersSuccess(
                    users.map((userData: any): any => new core.classes.User(userData)),
                ),
            );
        } catch (error) {
            dispatch(getUsersFailed(error));
        }
    };
}
