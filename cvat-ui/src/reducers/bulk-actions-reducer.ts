// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { BulkActionsState } from 'reducers';
import {
    BulkActionsTypes,
    BulkActions,
} from '../actions/bulk-actions';

const initialState: BulkActionsState = {
    fetching: false,
    status: null,
    cancelled: false,
};

export default function bulkActionsReducer(
    state = initialState,
    action: BulkActions,
): BulkActionsState {
    switch (action.type) {
        case BulkActionsTypes.START_BULK_ACTION:
            return {
                ...state,
                fetching: true,
                cancelled: false,
            };
        case BulkActionsTypes.CANCEL_BULK_ACTION:
            return { ...state, cancelled: true };
        case BulkActionsTypes.UPDATE_BULK_ACTION_STATUS:
            return { ...state, status: action.payload.status };
        case BulkActionsTypes.FINISH_BULK_ACTION:
            return {
                ...state,
                fetching: false,
                status: null,
                cancelled: false,
            };
        default:
            return state;
    }
}
