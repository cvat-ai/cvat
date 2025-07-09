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
    CANCEL_BULK_ACTION = 'CANCEL_BULK_ACTION',
    BULK_OPERATION_FAILED = 'BULK_OPERATION_FAILED',
}

export const selectionActions = {
    selectResource: (resourceID: number | string) => createAction(
        SelectionActionsTypes.SELECT_RESOURCE, { resourceID }),
    deselectResource: (resourceID: number | string) => createAction(
        SelectionActionsTypes.DESELECT_RESOURCE, { resourceID }),
    selectAllResources: (resourceIDs: (number | string)[]) => createAction(
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
    cancelBulkAction: () => createAction(
        SelectionActionsTypes.CANCEL_BULK_ACTION),
    bulkOperationFailed: (payload: {
        message: string;
        remainingItemsCount: number;
        retryPayload: any;
    }) => createAction(
        SelectionActionsTypes.BULK_OPERATION_FAILED, payload),
};

export function makeBulkOperationAsync<T>(
    items: T[],
    operation: (item: T, idx: number, total: number) => Promise<void>,
    statusMessage: (item: T, idx: number, total: number) => string,
) {
    return async (dispatch: any, getState: any) => {
        let processedCount = 0;
        try {
            if (items.length === 1) {
                await operation(items[0], 0, 1);
                return;
            }
            dispatch(selectionActions.startBulkAction());
            for (let i = 0; i < items.length; i++) {
                if (getState().selection.cancelled) {
                    break;
                }
                const item = items[i];
                dispatch(selectionActions.updateBulkActionStatus({
                    message: statusMessage(item, i, items.length),
                    percent: Math.round(((i + 1) / items.length) * 100),
                }));
                // eslint-disable-next-line no-await-in-loop
                await operation(item, i, items.length);
                processedCount = i + 1;
            }
        } catch (error) {
            const remainingItems = items.slice(processedCount);
            dispatch(selectionActions.bulkOperationFailed({
                message: 'Bulk operation failed',
                remainingItemsCount: remainingItems.length,
                retryPayload: {
                    items: remainingItems,
                    operation,
                    statusMessage,
                },
            }));
        } finally {
            dispatch(selectionActions.finishBulkAction());
        }
    };
}

export type SelectionActions = ActionUnion<typeof selectionActions>;
