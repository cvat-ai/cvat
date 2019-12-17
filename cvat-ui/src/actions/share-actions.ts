import { AnyAction, Dispatch, ActionCreator } from 'redux';
import { ThunkAction } from 'redux-thunk';

import { ShareFileInfo } from '../reducers/interfaces';
import getCore from '../core';

const core = getCore();

export enum ShareActionTypes {
    LOAD_SHARE_DATA = 'LOAD_SHARE_DATA',
    LOAD_SHARE_DATA_SUCCESS = 'LOAD_SHARE_DATA_SUCCESS',
    LOAD_SHARE_DATA_FAILED = 'LOAD_SHARE_DATA_FAILED',
}

function loadShareData(): AnyAction {
    const action = {
        type: ShareActionTypes.LOAD_SHARE_DATA,
        payload: {},
    };

    return action;
}

function loadShareDataSuccess(values: ShareFileInfo[], directory: string): AnyAction {
    const action = {
        type: ShareActionTypes.LOAD_SHARE_DATA_SUCCESS,
        payload: {
            values,
            directory,
        },
    };

    return action;
}

function loadShareDataFailed(error: any): AnyAction {
    const action = {
        type: ShareActionTypes.LOAD_SHARE_DATA_FAILED,
        payload: {
            error,
        },
    };

    return action;
}

export function loadShareDataAsync(directory: string, success: () => void, failure: () => void):
ThunkAction<Promise<void>, {}, {}, AnyAction> {
    return async (dispatch: ActionCreator<Dispatch>): Promise<void> => {
        try {
            dispatch(loadShareData());
            const values = await core.server.share(directory);
            success();
            dispatch(loadShareDataSuccess(values as ShareFileInfo[], directory));
        } catch (error) {
            dispatch(loadShareDataFailed(error));
            failure();
        }
    };
}
