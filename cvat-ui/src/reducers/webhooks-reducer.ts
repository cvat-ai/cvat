// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { AuthActionTypes } from 'actions/auth-actions';
import { WebhooksActionsTypes } from 'actions/webhooks-actions';
import { SelectionActionsTypes } from 'actions/selection-actions';
import { AnyAction } from 'redux';
import { omit } from 'lodash';
import { WebhooksState, SelectedResourceType } from 'reducers';

const defaultState: WebhooksState = {
    current: [],
    selected: [],
    totalCount: 0,
    query: {
        page: 1,
        pageSize: 10,
        id: null,
        projectId: null,
        search: null,
        filter: null,
        sort: null,
    },
    activities: {
        deletes: {},
    },
    fetching: false,
};

export default function (
    state: WebhooksState = defaultState,
    action: AnyAction,
): WebhooksState {
    switch (action.type) {
        case WebhooksActionsTypes.GET_WEBHOOKS: {
            return {
                ...state,
                fetching: true,
                query: {
                    ...state.query,
                    ...action.payload.query,
                },
            };
        }
        case WebhooksActionsTypes.GET_WEBHOOKS_SUCCESS:
            return {
                ...state,
                fetching: false,
                totalCount: action.payload.count,
                current: action.payload.webhooks,
            };
        case WebhooksActionsTypes.GET_WEBHOOKS_FAILED:
            return {
                ...state,
                fetching: false,
            };
        case WebhooksActionsTypes.DELETE_WEBHOOK: {
            const { webhookId } = action.payload;
            return {
                ...state,
                activities: {
                    ...state.activities,
                    deletes: {
                        ...state.activities.deletes,
                        [webhookId]: false,
                    },
                },
            };
        }
        case WebhooksActionsTypes.DELETE_WEBHOOK_SUCCESS: {
            const { webhookId } = action.payload;
            return {
                ...state,
                activities: {
                    ...state.activities,
                    deletes: {
                        ...state.activities.deletes,
                        [webhookId]: true,
                    },
                },
            };
        }
        case WebhooksActionsTypes.DELETE_WEBHOOK_FAILED: {
            const { webhookId } = action.payload;
            return {
                ...state,
                activities: {
                    ...state.activities,
                    deletes: omit(state.activities.deletes, webhookId),
                },
            };
        }
        case AuthActionTypes.LOGOUT_SUCCESS: {
            return { ...defaultState };
        }
        case SelectionActionsTypes.DESELECT_RESOURCES: {
            if (action.payload.resourceType === SelectedResourceType.WEBHOOKS) {
                return {
                    ...state,
                    selected: state.selected.filter((id: number) => !action.payload.resourceIds.includes(id)),
                };
            }
            return state;
        }
        case SelectionActionsTypes.SELECT_RESOURCES: {
            if (action.payload.resourceType === SelectedResourceType.WEBHOOKS) {
                return {
                    ...state,
                    selected: Array.from(new Set([...state.selected, ...action.payload.resourceIds])),
                };
            }
            return state;
        }
        case SelectionActionsTypes.CLEAR_SELECTED_RESOURCES: {
            return { ...state, selected: [] };
        }
        default:
            return state;
    }
}
