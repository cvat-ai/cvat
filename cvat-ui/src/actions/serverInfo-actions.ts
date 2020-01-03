import { AnyAction, Dispatch, ActionCreator } from 'redux';
import { ThunkAction } from 'redux-thunk';

import getCore from '../core';

const core = getCore();

export enum ServerInfoActionTypes {
    GET_SERVER_INFO = 'GET_SERVER_INFO',
    GET_SERVER_INFO_SUCCESS = 'GET_SERVER_INFO_SUCCESS',
    GET_SERVER_INFO_FAILED = 'GET_SERVER_INFO_FAILED',
}

function getServerInfo(): AnyAction {
    const action = {
        type: ServerInfoActionTypes.GET_SERVER_INFO,
        payload: {},
    };

    return action;
}

function getServerInfoSuccess(serverInfo: string): AnyAction {
    const action = {
        type: ServerInfoActionTypes.GET_SERVER_INFO_SUCCESS,
        payload: { serverInfo },
    };

    return action;
}

function getServerInfoFailed(error: any): AnyAction {
    const action = {
        type: ServerInfoActionTypes.GET_SERVER_INFO_FAILED,
        payload: { error },
    };

    return action;
}

export function getServerInfoAsync():
ThunkAction<Promise<void>, {}, {}, AnyAction> {
    return async (dispatch: ActionCreator<Dispatch>): Promise<void> => {
        dispatch(getServerInfo());

        try {
            const about = await core.server.about();
            dispatch(
                getServerInfoSuccess(about),
            );
        } catch (error) {
            dispatch(getServerInfoFailed(error));
        }
    };
}
