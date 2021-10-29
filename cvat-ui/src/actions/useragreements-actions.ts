// Copyright (C) 2020-2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

import { ActionUnion, createAction, ThunkAction } from 'utils/redux';
import getCore from 'cvat-core-wrapper';
import { UserAgreement } from 'reducers/interfaces';

const core = getCore();

export enum UserAgreementsActionTypes {
    GET_USER_AGREEMENTS = 'GET_USER_AGREEMENTS',
    GET_USER_AGREEMENTS_SUCCESS = 'GET_USER_AGREEMENTS_SUCCESS',
    GET_USER_AGREEMENTS_FAILED = 'GET_USER_AGREEMENTS_FAILED',
}

const userAgreementsActions = {
    getUserAgreements: () => createAction(UserAgreementsActionTypes.GET_USER_AGREEMENTS),
    getUserAgreementsSuccess: (userAgreements: UserAgreement[]) => (
        createAction(UserAgreementsActionTypes.GET_USER_AGREEMENTS_SUCCESS, userAgreements)
    ),
    getUserAgreementsFailed: (error: any) => (
        createAction(UserAgreementsActionTypes.GET_USER_AGREEMENTS_FAILED, { error })
    ),
};

export type UserAgreementsActions = ActionUnion<typeof userAgreementsActions>;

export const getUserAgreementsAsync = (): ThunkAction => async (dispatch): Promise<void> => {
    dispatch(userAgreementsActions.getUserAgreements());

    try {
        const userAgreements = await core.server.userAgreements();
        dispatch(userAgreementsActions.getUserAgreementsSuccess(userAgreements));
    } catch (error) {
        dispatch(userAgreementsActions.getUserAgreementsFailed(error));
    }
};
