import { AnyAction, Dispatch, ActionCreator } from 'redux';
import { ThunkAction } from 'redux-thunk';
import cvat from '../../public/cvat-core.node';

export enum AuthActionTypes {
    AUTHORIZED_ASYNC = 'AUTHORIZED_ASYNC',
    AUTHORIZED_FETCHING = 'AUTHORIZED_FETCHING',
    AUTHORIZED_SUCCESS = 'AUTHORIZED_SUCCESS',
    AUTHORIZED_FAILED = 'AUTHORIZED_FAILED',
}

export function authorizedSuccess(userInstance: any): AnyAction {
    return {
        type: AuthActionTypes.AUTHORIZED_SUCCESS,
        payload: {
            user: userInstance,
        },
    };
}

export function authorizedFailed(error: string): AnyAction {
    return {
        type: AuthActionTypes.AUTHORIZED_FAILED,
        payload: {
            error,
        },
    };
}

export function authorizedAsync(): ThunkAction<Promise<void>, {}, {}, AnyAction> {
    return async (dispatch: ActionCreator<Dispatch>): Promise<void> => {
        let result = null;
        try {
            result = await (cvat as any).server.authorized();
        } catch (error) {
            dispatch(authorizedFailed(error.toString()));
        }

        if (result) {
            const userInstance = await (cvat as any).users.get({ self: true });
            dispatch(authorizedSuccess(userInstance));
        } else {
            dispatch(authorizedSuccess(null));
        }
    };
}
