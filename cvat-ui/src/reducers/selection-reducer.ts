// Copyright (C) 2020-2022 Intel Corporation
// SPDX-License-Identifier: MIT

import { SelectionState } from 'reducers';
import {
    SelectionActionsTypes,
    SelectionActions,
} from '../actions/selection-actions';

const initialState: SelectionState = {
    selected: [],
    fetching: false,
    status: null,
    cancelled: false,
};

export default function selectionReducer(
    state = initialState,
    action: SelectionActions,
): SelectionState {
    switch (action.type) {
        case SelectionActionsTypes.DESELECT_RESOURCES:
            return { ...state, selected: state.selected.filter((id) => !action.payload.resourceIds.includes(id)) };
        case SelectionActionsTypes.SELECT_RESOURCES:
            if (action.payload.extendSelection) {
                return { ...state, selected: Array.from(new Set([...state.selected, ...action.payload.resourceIds])) };
            }
            return { ...state, selected: [...action.payload.resourceIds] };
        case SelectionActionsTypes.CLEAR_SELECTED_RESOURCES:
            return { ...state, selected: [] };
        case SelectionActionsTypes.START_BULK_ACTION:
            return {
                ...state,
                fetching: true,
                cancelled: false,
            };
        case SelectionActionsTypes.CANCEL_BULK_ACTION:
            return { ...state, cancelled: true };
        case SelectionActionsTypes.UPDATE_BULK_ACTION_STATUS:
            return { ...state, status: action.payload.status };
        case SelectionActionsTypes.FINISH_BULK_ACTION:
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
