// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { useHistory } from 'react-router';
import {
    Progress, Button,
} from 'antd';
import { useSelector, useDispatch } from 'react-redux';
import { selectionActions, makeBulkOperationAsync } from 'actions/selection-actions';
import { CombinedState } from 'reducers';
import { resetErrors } from 'actions/notification-actions';
import notification from 'antd/lib/notification';
import CVATMarkdown from './common/cvat-markdown';

export default function BulkProgress(): JSX.Element | null {
    const dispatch = useDispatch();
    const history = useHistory();
    const fetching = useSelector((state: CombinedState) => state.selection.fetching);
    const status = useSelector((state: CombinedState) => state.selection.status);
    const bulkError = useSelector((state: CombinedState) => state.notifications.errors.selection.bulkOperation);

    const percent = status?.percent ?? 0;
    const message = status?.message ?? 'Processing...';

    const handleRetry = (): void => {
        if (bulkError?.retryPayload) {
            const { items, operation, statusMessage } = bulkError.retryPayload;
            dispatch(resetErrors());
            dispatch(makeBulkOperationAsync(items, operation, statusMessage));
        }
    };

    if (bulkError && !fetching) {
        const { remainingItemsCount, message: errorMessage } = bulkError;
        const description = (
            <>
                {remainingItemsCount > 0 ? (
                    <>
                        Some items failed to process. You can retry the operation for the remaining
                        {` ${remainingItemsCount} items.`}
                    </>
                ) : (
                    'An error occurred during the bulk operation.'
                )}
                {remainingItemsCount > 0 && (
                    <>
                        <br />
                        <Button
                            type='primary'
                            size='small'
                            onClick={() => {
                                notification.destroy();
                                handleRetry();
                            }}
                        >
                            Retry
                        </Button>
                    </>
                )}
            </>
        );

        setTimeout(() => {
            notification.error({
                message: (
                    <CVATMarkdown history={history}>{errorMessage}</CVATMarkdown>
                ),
                duration: null,
                description,
            });
        });
    }

    if (!fetching || bulkError) return null;

    return (
        <div className='cvat-bulk-progress-wrapper'>
            <Progress type='circle' percent={percent} size={120} />
            <div className='cvat-bulk-progress-message'>
                {message}
            </div>
            <Button
                className='cvat-bulk-progress-cancel'
                danger
                onClick={() => dispatch(selectionActions.cancelBulkAction())}
            >
                Cancel
            </Button>
        </div>
    );
}
