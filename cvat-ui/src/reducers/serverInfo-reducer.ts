import { AnyAction } from 'redux';
import { ServerInfoState } from './interfaces';

import { AuthActionTypes } from '../actions/auth-actions';
import { ServerInfoActionTypes } from '../actions/serverInfo-actions';

const defaultState: ServerInfoState = {
    serverInfo: '',
    fetching: false,
    initialized: false,
};

export default function (state: ServerInfoState = defaultState, action: AnyAction): ServerInfoState {
    switch (action.type) {
        case ServerInfoActionTypes.GET_SERVER_INFO: {
            return {
                ...state,
                fetching: true,
                initialized: false,
            };
        }
        case ServerInfoActionTypes.GET_SERVER_INFO_SUCCESS:
            return {
                ...state,
                fetching: false,
                initialized: true,
                serverInfo: action.payload.serverInfo,
            };
        case ServerInfoActionTypes.GET_SERVER_INFO_FAILED:
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
            return {
                ...state,
            };
    }
}
