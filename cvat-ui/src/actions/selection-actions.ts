// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { ActionUnion, createAction } from 'utils/redux';

export enum SelectionActionsTypes {
    SELECT_RESOURCE = 'SELECT_RESOURCE',
    DESELECT_RESOURCE = 'DESELECT_RESOURCE',
    SELECT_ALL_RESOURCES = 'SELECT_ALL_RESOURCES',
    CLEAR_SELECTED_RESOURCES = 'CLEAR_SELECTED_RESOURCES',
    SET_SELECTION_RESOURCE_TYPE = 'SET_SELECTION_RESOURCE_TYPE',
    START_BULK_ACTION = 'START_BULK_ACTION',
    UPDATE_BULK_ACTION_STATUS = 'UPDATE_BULK_ACTION_STATUS',
    FINISH_BULK_ACTION = 'FINISH_BULK_ACTION',
}

export const selectionActions = {
    selectResource: (resourceID: number) => createAction(
        SelectionActionsTypes.SELECT_RESOURCE, { resourceID }),
    deselectResource: (resourceID: number) => createAction(
        SelectionActionsTypes.DESELECT_RESOURCE, { resourceID }),
    selectAllResources: (resourceIDs: number[]) => createAction(
        SelectionActionsTypes.SELECT_ALL_RESOURCES, { resourceIDs }),
    clearSelectedResources: () => createAction(
        SelectionActionsTypes.CLEAR_SELECTED_RESOURCES),
    setSelectionResourceType: (resourceType: string) => createAction(
        SelectionActionsTypes.SET_SELECTION_RESOURCE_TYPE, { resourceType }),
    startBulkAction: () => createAction(
        SelectionActionsTypes.START_BULK_ACTION),
    updateBulkActionStatus: (status: string) => createAction(
        SelectionActionsTypes.UPDATE_BULK_ACTION_STATUS, { status }),
    finishBulkAction: () => createAction(
        SelectionActionsTypes.FINISH_BULK_ACTION),
};

export type SelectionActions = ActionUnion<typeof selectionActions>;
