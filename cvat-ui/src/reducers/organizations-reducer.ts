// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { AuthActionTypes } from 'actions/auth-actions';
import { OrganizationActionsTypes } from 'actions/organization-actions';
import { SelectionActionsTypes } from 'actions/selection-actions';
import { AnyAction } from 'redux';
import { OrganizationState, SelectedResourceType } from '.';

const defaultState: OrganizationState = {
    initialized: false,
    fetching: false,
    updating: false,
    inviting: false,
    leaving: false,
    removingMember: false,
    updatingMember: false,
    fetchingMembers: false,
    currentArray: [],
    currentArrayFetching: false,
    gettingQuery: {
        page: 1,
        search: '',
    },
    count: 0,
    nextPageUrl: null,
    selectModal: {
        visible: false,
        onSelectCallback: null,
    },
    members: [],
    selectedMembers: [],
    membersQuery: {
        page: 1,
        pageSize: 10,
        search: null,
        filter: null,
        sort: null,
    },
};

export default function (
    state: OrganizationState = defaultState,
    action: AnyAction,
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
        case OrganizationActionsTypes.GET_ORGANIZATION_MEMBERS: {
            const { membersQuery } = action.payload;
            return {
                ...state,
                fetchingMembers: true,
                members: [],
                membersQuery: {
                    ...state.membersQuery,
                    ...membersQuery,
                },
            };
        }
        case OrganizationActionsTypes.GET_ORGANIZATION_MEMBERS_SUCCESS: {
            return {
                ...state,
                fetchingMembers: false,
                members: action.payload.members,
            };
        }
        case OrganizationActionsTypes.GET_ORGANIZATION_MEMBERS_FAILED: {
            return {
                ...state,
                fetchingMembers: false,
            };
        }
        case AuthActionTypes.LOGOUT_SUCCESS: {
            return { ...defaultState };
        }
        case OrganizationActionsTypes.GET_ORGANIZATIONS: {
            const { query } = action.payload;
            return {
                ...state,
                currentArrayFetching: true,
                currentArray: [],
                count: 0,
                nextPageUrl: null,
                gettingQuery: {
                    ...defaultState.gettingQuery,
                    ...query,
                },
            };
        }
        case OrganizationActionsTypes.GET_ORGANIZATIONS_SUCCESS: {
            const { organizations, count, nextPageUrl } = action.payload;
            return {
                ...state,
                currentArrayFetching: false,
                count,
                currentArray: organizations,
                nextPageUrl: nextPageUrl || null,
            };
        }
        case OrganizationActionsTypes.GET_ORGANIZATIONS_FAILED: {
            return {
                ...state,
                currentArrayFetching: false,
            };
        }
        case OrganizationActionsTypes.OPEN_SELECT_ORGANIZATION_MODAL: {
            const { onSelectCallback } = action.payload;
            return {
                ...state,
                selectModal: {
                    visible: true,
                    onSelectCallback,
                },
            };
        }
        case OrganizationActionsTypes.CLOSE_SELECT_ORGANIZATION_MODAL: {
            return {
                ...state,
                selectModal: {
                    visible: false,
                    onSelectCallback: null,
                },
            };
        }
        case SelectionActionsTypes.DESELECT_RESOURCES: {
            if (action.payload.resourceType === SelectedResourceType.MEMBERS) {
                return {
                    ...state,
                    selectedMembers: state.selectedMembers.filter(
                        (id: number) => !action.payload.resourceIds.includes(id),
                    ),
                };
            }
            return state;
        }
        case SelectionActionsTypes.SELECT_RESOURCES: {
            if (action.payload.resourceType === SelectedResourceType.MEMBERS) {
                return {
                    ...state,
                    selectedMembers: Array.from(new Set([...state.selectedMembers, ...action.payload.resourceIds])),
                };
            }
            return state;
        }
        case SelectionActionsTypes.CLEAR_SELECTED_RESOURCES: {
            return { ...state, selectedMembers: [] };
        }
        default:
            return state;
    }
}
