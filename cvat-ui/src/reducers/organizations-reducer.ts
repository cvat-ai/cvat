// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { AuthActions, AuthActionTypes } from 'actions/auth-actions';
import { OrganizationActions, OrganizationActionsTypes } from 'actions/organization-actions';
import { OrganizationState } from '.';

const defaultState: OrganizationState = {
    initialized: false,
    fetching: false,
    updating: false,
    inviting: false,
    leaving: false,
    removingMember: false,
    updatingMember: false,
};

export default function (
    state: OrganizationState = defaultState,
    action: OrganizationActions | AuthActions,
): OrganizationState {
    switch (action.type) {
        case OrganizationActionsTypes.ACTIVATE_ORGANIZATION: {
            return {
                ...state,
                fetching: true,
            };
        }
        case OrganizationActionsTypes.ACTIVATE_ORGANIZATION_SUCCESS: {
            return {
                ...state,
                initialized: true,
                fetching: false,
                current: action.payload.organization,
            };
        }
        case OrganizationActionsTypes.ACTIVATE_ORGANIZATION_FAILED: {
            return {
                ...state,
                fetching: false,
                initialized: true,
            };
        }
        case OrganizationActionsTypes.UPDATE_ORGANIZATION: {
            return {
                ...state,
                updating: true,
            };
        }
        case OrganizationActionsTypes.UPDATE_ORGANIZATION_SUCCESS: {
            const { organization } = action.payload;
            return {
                ...state,
                current: state.current && state.current.slug === organization.slug ? organization : state.current,
                updating: false,
            };
        }
        case OrganizationActionsTypes.UPDATE_ORGANIZATION_FAILED: {
            return {
                ...state,
                updating: false,
            };
        }
        case OrganizationActionsTypes.REMOVE_ORGANIZATION: {
            return {
                ...state,
                fetching: true,
            };
        }
        case OrganizationActionsTypes.REMOVE_ORGANIZATION_SUCCESS: {
            return {
                ...state,
                fetching: false,
                current: null,
            };
        }
        case OrganizationActionsTypes.REMOVE_ORGANIZATION_FAILED: {
            return {
                ...state,
                fetching: false,
            };
        }
        case OrganizationActionsTypes.INVITE_ORGANIZATION_MEMBERS: {
            return {
                ...state,
                inviting: true,
            };
        }
        case OrganizationActionsTypes.INVITE_ORGANIZATION_MEMBERS_DONE:
        case OrganizationActionsTypes.INVITE_ORGANIZATION_MEMBERS_FAILED: {
            return {
                ...state,
                inviting: false,
            };
        }
        case OrganizationActionsTypes.LEAVE_ORGANIZATION: {
            return {
                ...state,
                leaving: true,
            };
        }
        case OrganizationActionsTypes.LEAVE_ORGANIZATION_SUCCESS:
        case OrganizationActionsTypes.LEAVE_ORGANIZATION_FAILED: {
            return {
                ...state,
                leaving: false,
            };
        }
        case OrganizationActionsTypes.REMOVE_ORGANIZATION_MEMBER: {
            return {
                ...state,
                removingMember: true,
            };
        }
        case OrganizationActionsTypes.REMOVE_ORGANIZATION_MEMBER_SUCCESS:
        case OrganizationActionsTypes.REMOVE_ORGANIZATION_MEMBER_FAILED: {
            return {
                ...state,
                removingMember: false,
            };
        }
        case OrganizationActionsTypes.UPDATE_ORGANIZATION_MEMBER: {
            return {
                ...state,
                updatingMember: true,
            };
        }
        case OrganizationActionsTypes.UPDATE_ORGANIZATION_MEMBER_SUCCESS:
        case OrganizationActionsTypes.UPDATE_ORGANIZATION_MEMBER_FAILED: {
            return {
                ...state,
                updatingMember: false,
            };
        }
        case AuthActionTypes.LOGOUT_SUCCESS: {
            return { ...defaultState };
        }
        default:
            return state;
    }
}
