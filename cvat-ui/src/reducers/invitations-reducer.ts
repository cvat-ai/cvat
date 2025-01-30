// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { AnyAction } from 'redux';

import { InvitationsActionTypes } from 'actions/invitations-actions';
import { AuthActionTypes } from 'actions/auth-actions';
import { InvitationsState } from '.';

const defaultState: InvitationsState = {
    fetching: false,
    initialized: false,
    current: [],
    count: 0,
    query: {
        page: 1,
    },
};

export default (state: InvitationsState = defaultState, action: AnyAction): InvitationsState => {
    switch (action.type) {
        case InvitationsActionTypes.GET_INVITATIONS:
            return {
                ...state,
                fetching: true,
                current: [],
                query: {
                    ...state.query,
                    ...action.payload.query,
                },
            };
        case InvitationsActionTypes.GET_INVITATIONS_SUCCESS: {
            return {
                ...state,
                fetching: false,
                initialized: true,
                current: action.payload.invitations,
                count: action.payload.invitations.count,
            };
        }
        case InvitationsActionTypes.GET_INVITATIONS_FAILED: {
            return {
                ...state,
                fetching: false,
                initialized: true,
                current: [],
            };
        }
        case AuthActionTypes.LOGOUT_SUCCESS: {
            return { ...defaultState };
        }
        default:
            return state;
    }
};
