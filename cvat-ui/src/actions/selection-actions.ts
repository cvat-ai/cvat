// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { CombinedState } from 'reducers';
import { ActionUnion, createAction, ThunkDispatch } from 'utils/redux';

export enum SelectionActionsTypes {
    DESELECT_RESOURCES = 'DESELECT_RESOURCES',
    SELECT_RESOURCES = 'SELECT_RESOURCES',
    CLEAR_SELECTED_RESOURCES = 'CLEAR_SELECTED_RESOURCES',
    SET_SELECTION_RESOURCE_TYPE = 'SET_SELECTION_RESOURCE_TYPE',
    START_BULK_ACTION = 'START_BULK_ACTION',
    UPDATE_BULK_ACTION_STATUS = 'UPDATE_BULK_ACTION_STATUS',
    FINISH_BULK_ACTION = 'FINISH_BULK_ACTION',
    CANCEL_BULK_ACTION = 'CANCEL_BULK_ACTION',
    BULK_OPERATION_FAILED = 'BULK_OPERATION_FAILED',
}

export const selectionActions = {
    deselectResources: (resourceIds: (number | string)[]) => createAction(
        SelectionActionsTypes.DESELECT_RESOURCES, { resourceIds }),
    selectResources: (resourceIds: (number | string)[], extendSelection = false) => createAction(
        SelectionActionsTypes.SELECT_RESOURCES, { resourceIds, extendSelection }),
    clearSelectedResources: () => createAction(
        SelectionActionsTypes.CLEAR_SELECTED_RESOURCES),
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
        retryPayload: {
            items: any,
            operation: (item: any, idx: number, total: number) => Promise<void>,
            statusMessage: (item: any, idx: number, total: number) => string,
        };
    }) => createAction(
        SelectionActionsTypes.BULK_OPERATION_FAILED, payload),
};

export function makeBulkOperationAsync<T>(
    items: T[],
    operation: (item: T, idx: number, total: number) => Promise<void>,
    statusMessage: (item: T, idx: number, total: number) => string,
) {
    return async (dispatch: ThunkDispatch, getState: () => CombinedState) => {
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
