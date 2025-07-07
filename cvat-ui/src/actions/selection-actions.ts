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
    updateBulkActionStatus: (status: { message: string; percent: number }) => createAction(
        SelectionActionsTypes.UPDATE_BULK_ACTION_STATUS, { status }),
    finishBulkAction: () => createAction(
        SelectionActionsTypes.FINISH_BULK_ACTION),
};

export function makeBulkOperationAsync<T>(
    items: T[],
    operation: (item: T, idx: number, total: number) => Promise<void>,
    statusMessage: (item: T, idx: number, total: number) => string,
) {
    return async (dispatch: any) => {
        if (items.length === 1) {
            await operation(items[0], 0, 1);
            return;
        }
        dispatch(selectionActions.startBulkAction());
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            dispatch(selectionActions.updateBulkActionStatus({
                message: statusMessage(item, i, items.length),
                percent: Math.round(((i + 1) / items.length) * 100),
            }));
            // eslint-disable-next-line no-await-in-loop
            await operation(item, i, items.length);
        }
        dispatch(selectionActions.finishBulkAction());
    };
}

export type SelectionActions = ActionUnion<typeof selectionActions>;
