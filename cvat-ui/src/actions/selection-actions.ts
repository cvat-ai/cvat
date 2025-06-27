// Copyright (C) 2020-2022 Intel Corporation
// SPDX-License-Identifier: MIT

export const SELECT_RESOURCE = 'SELECT_RESOURCE';
export const DESELECT_RESOURCE = 'DESELECT_RESOURCE';
export const SELECT_ALL_RESOURCES = 'SELECT_ALL_RESOURCES';
export const CLEAR_SELECTED_RESOURCES = 'CLEAR_SELECTED_RESOURCES';
export const SET_SELECTION_RESOURCE_TYPE = 'SET_SELECTION_RESOURCE_TYPE';

export function selectResource(resourceID: number) {
    return { type: SELECT_RESOURCE, payload: resourceID };
}

export function deselectResource(resourceID: number) {
    return { type: DESELECT_RESOURCE, payload: resourceID };
}

export function selectAllResources(resourceIDs: number[]) {
    return { type: SELECT_ALL_RESOURCES, payload: resourceIDs };
}

export function clearSelectedResources() {
    return { type: CLEAR_SELECTED_RESOURCES };
}

export function setSelectionResourceType(resourceType: string) {
    return { type: SET_SELECTION_RESOURCE_TYPE, payload: resourceType };
}
