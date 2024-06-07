// Copyright (C) 2020-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

import { UserAgreementsActions, UserAgreementsActionTypes } from 'actions/useragreements-actions';
import { UserAgreementsState } from '.';

const defaultState: UserAgreementsState = {
    list: [],
    fetching: false,
    initialized: false,
};

export default function (
    state: UserAgreementsState = defaultState,
    action: UserAgreementsActions,
): UserAgreementsState {
    switch (action.type) {
        case UserAgreementsActionTypes.GET_USER_AGREEMENTS: {
            return {
                ...state,
                fetching: true,
                initialized: false,
            };
        }
        case UserAgreementsActionTypes.GET_USER_AGREEMENTS_SUCCESS:
            return {
                ...state,
                fetching: false,
                initialized: true,
                list: action.payload,
            };
        case UserAgreementsActionTypes.GET_USER_AGREEMENTS_FAILED:
            return {
                ...state,
                fetching: false,
                initialized: true,
            };
        default:
            return state;
    }
}
