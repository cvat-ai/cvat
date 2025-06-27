// Copyright (C) 2020-2022 Intel Corporation
// SPDX-License-Identifier: MIT

import {
    SELECT_RESOURCE,
    DESELECT_RESOURCE,
    SELECT_ALL_RESOURCES,
    CLEAR_SELECTED_RESOURCES,
    SET_SELECTION_RESOURCE_TYPE,
} from '../actions/selection-actions';

interface SelectionState {
    selected: number[];
    resourceType: string;
}

const initialState: SelectionState = {
    selected: [],
    resourceType: '',
};

export default function selectionReducer(state = initialState, action: any): SelectionState {
    switch (action.type) {
        case SET_SELECTION_RESOURCE_TYPE:
            return { ...state, resourceType: action.payload, selected: [] };
        case SELECT_RESOURCE:
            if (!state.selected.includes(action.payload)) {
                return { ...state, selected: [...state.selected, action.payload] };
            }
            return state;
        case DESELECT_RESOURCE:
            return { ...state, selected: state.selected.filter((id) => id !== action.payload) };
        case SELECT_ALL_RESOURCES:
            return { ...state, selected: [...action.payload] };
        case CLEAR_SELECTED_RESOURCES:
            return { ...state, selected: [] };
        default:
            return state;
    }
}
