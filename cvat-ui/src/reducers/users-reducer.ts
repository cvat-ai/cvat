import { AuthActionTypes, AuthActions } from 'actions/auth-actions';
import { UsersActionTypes, UsersActions } from 'actions/users-actions';
import { UsersState } from './interfaces';

const defaultState: UsersState = {
    users: [],
    fetching: false,
    initialized: false,
};

export default function (
    state: UsersState = defaultState,
    action: UsersActions | AuthActions,
): UsersState {
    switch (action.type) {
        case UsersActionTypes.GET_USERS: {
            return {
                ...state,
                fetching: true,
                initialized: false,
            };
        }
        case UsersActionTypes.GET_USERS_SUCCESS:
            return {
                ...state,
                fetching: false,
                initialized: true,
                users: action.payload.users,
            };
        case UsersActionTypes.GET_USERS_FAILED:
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
