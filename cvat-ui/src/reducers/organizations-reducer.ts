// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

import { OrganizationActions, OrganizationActionsTypes } from 'actions/organization-actions';
import { OrganizationState } from './interfaces';

const defaultState: OrganizationState = {
    list: [],
    current: null,
    fetching: false,
    creating: false,
    saving: false,
};

export default function (state: OrganizationState = defaultState, action: OrganizationActions): OrganizationState {
    switch (action.type) {
        case OrganizationActionsTypes.GET_ORGANIZATIONS: {
            return {
                ...state,
                fetching: true,
            };
        }
        case OrganizationActionsTypes.GET_ORGANIZATIONS_SUCCESS:
            return {
                ...state,
                fetching: false,
                list: action.payload.list,
            };
        case OrganizationActionsTypes.GET_ORGANIZATIONS_FAILED:
            return {
                ...state,
                fetching: false,
            };
        case OrganizationActionsTypes.ACTIVATE_ORGANIZATION: {
            return {
                ...state,
                fetching: true,
            };
        }
        case OrganizationActionsTypes.ACTIVATE_ORGANIZATION_SUCCESS: {
            return {
                ...state,
                fetching: false,
                current: action.payload.organization,
            };
        }
        case OrganizationActionsTypes.ACTIVATE_ORGANIZATION_FAILED: {
            return {
                ...state,
                fetching: false,
            };
        }
        case OrganizationActionsTypes.CREATE_ORGANIZATION: {
            return {
                ...state,
                creating: true,
            };
        }
        case OrganizationActionsTypes.CREATE_ORGANIZATION_SUCCESS: {
            return {
                ...state,
                list: [...state.list, action.payload.organization],
                creating: false,
            };
        }
        case OrganizationActionsTypes.CREATE_ORGANIZATION_FAILED: {
            return {
                ...state,
                creating: false,
            };
        }
        default:
            return state;
    }
}
