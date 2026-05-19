// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { CombinedState } from 'reducers';
import { ActionUnion, createAction, ThunkDispatch } from 'utils/redux';
import { selectionActions } from './selection-actions';

export enum BulkActionsTypes {
    START_BULK_ACTION = 'START_BULK_ACTION',
    UPDATE_BULK_ACTION_STATUS = 'UPDATE_BULK_ACTION_STATUS',
    FINISH_BULK_ACTION = 'FINISH_BULK_ACTION',
    CANCEL_BULK_ACTION = 'CANCEL_BULK_ACTION',
    BULK_OPERATION_FAILED = 'BULK_OPERATION_FAILED',
}

export const bulkActions = {
    startBulkAction: () => createAction(
        BulkActionsTypes.START_BULK_ACTION),
    updateBulkActionStatus: (status: { message: string; percent: number }) => createAction(
        BulkActionsTypes.UPDATE_BULK_ACTION_STATUS, { status }),
    finishBulkAction: () => createAction(
        BulkActionsTypes.FINISH_BULK_ACTION),
    cancelBulkAction: () => createAction(
        BulkActionsTypes.CANCEL_BULK_ACTION),
    bulkOperationFailed: (payload: {
        error: any;
        remainingItemsCount: number;
        retryPayload: {
            items: any,
            operation: (item: any, idx: number, total: number) => Promise<void>,
            statusMessage: (item: any, idx: number, total: number) => string,
        };
    }) => createAction(
        BulkActionsTypes.BULK_OPERATION_FAILED, payload),
};

export function makeBulkOperationAsync<T>(
    items: T[],
    operation: (item: T, idx: number, total: number) => Promise<void>,
    statusMessage: (item: T, idx: number, total: number) => string,
    onSuccess?: () => void,
) {
    return async (dispatch: ThunkDispatch, getState: () => CombinedState) => {
        let processedCount = 0;

        if (items.length === 1) {
            await operation(items[0], 0, 1);
            onSuccess?.();
            dispatch(selectionActions.clearSelectedResources());
            return 1;
        }

        try {
            dispatch(bulkActions.startBulkAction());
            for (let i = 0; i < items.length; i++) {
                if (getState().bulkActions.cancelled) {
                    break;
                }
                const item = items[i];
                dispatch(bulkActions.updateBulkActionStatus({
                    message: statusMessage(item, i, items.length),
                    percent: Math.round(((i + 1) / items.length) * 100),
                }));
                await operation(item, i, items.length);
                processedCount = i + 1;
            }
            onSuccess?.();
            dispatch(selectionActions.clearSelectedResources());
        } catch (error) {
            const remainingItems = items.slice(processedCount);
            dispatch(bulkActions.bulkOperationFailed({
                error,
                remainingItemsCount: remainingItems.length,
                retryPayload: {
                    items: remainingItems,
                    operation,
                    statusMessage,
                },
            }));
        } finally {
            dispatch(bulkActions.finishBulkAction());
        }

        return processedCount;
    };
}

export type BulkActions = ActionUnion<typeof bulkActions>;
