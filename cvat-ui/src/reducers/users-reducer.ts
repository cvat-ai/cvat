import { AnyAction } from 'redux';
import { UsersState } from './interfaces';

import { UsersActionTypes } from '../actions/users-actions';

const initialState: UsersState = {
    users: [],
    initialized: false,
    gettingUsersError: null,
};

export default function (state: UsersState = initialState, action: AnyAction): UsersState {
    switch (action.type) {
        case UsersActionTypes.GET_USERS:
            return {
                ...state,
                initialized: false,
                gettingUsersError: null,
            };
        case UsersActionTypes.GET_USERS_SUCCESS:
            return {
                ...state,
                initialized: true,
                users: action.payload.users,
            };
        case UsersActionTypes.GET_USERS_FAILED:
            return {
                ...state,
                initialized: true,
                users: [],
                gettingUsersError: action.payload.error,
            };
        default:
            return {
                ...state,
            };
    }
}
