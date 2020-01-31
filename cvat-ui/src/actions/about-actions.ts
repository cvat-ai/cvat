import { AnyAction, Dispatch, ActionCreator } from 'redux';
import { ThunkAction } from 'redux-thunk';

import getCore from 'cvat-core';

const core = getCore();

export enum AboutActionTypes {
    GET_ABOUT = 'GET_ABOUT',
    GET_ABOUT_SUCCESS = 'GET_ABOUT_SUCCESS',
    GET_ABOUT_FAILED = 'GET_ABOUT_FAILED',
}

function getAbout(): AnyAction {
    const action = {
        type: AboutActionTypes.GET_ABOUT,
        payload: {},
    };

    return action;
}

function getAboutSuccess(server: any): AnyAction {
    const action = {
        type: AboutActionTypes.GET_ABOUT_SUCCESS,
        payload: { server },
    };

    return action;
}

function getAboutFailed(error: any): AnyAction {
    const action = {
        type: AboutActionTypes.GET_ABOUT_FAILED,
        payload: { error },
    };

    return action;
}

export function getAboutAsync():
ThunkAction<Promise<void>, {}, {}, AnyAction> {
    return async (dispatch: ActionCreator<Dispatch>): Promise<void> => {
        dispatch(getAbout());

        try {
            const about = await core.server.about();
            dispatch(
                getAboutSuccess(about),
            );
        } catch (error) {
            dispatch(getAboutFailed(error));
        }
    };
}
