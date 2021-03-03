// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import { BoundariesActions, BoundariesActionTypes } from 'actions/boundaries-actions';
import { UserAgreementsActions, UserAgreementsActionTypes } from 'actions/useragreements-actions';
import { AuthActions, AuthActionTypes } from 'actions/auth-actions';
import { UserAgreementsState } from './interfaces';

const defaultState: UserAgreementsState = {
    list: [],
    fetching: false,
    initialized: false,
};

export default function (
    state: UserAgreementsState = defaultState,
    action: UserAgreementsActions | AuthActions | BoundariesActions,
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
        case AuthActionTypes.LOGOUT_SUCCESS:
        case BoundariesActionTypes.RESET_AFTER_ERROR: {
            return {
                ...defaultState,
            };
        }
        default:
            return state;
    }
}
