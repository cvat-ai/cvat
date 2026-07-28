// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { useHistory } from 'react-router';
import { useSelector, useDispatch } from 'react-redux';
import notification from 'antd/lib/notification';
import Button from 'antd/lib/button';
import Progress from 'antd/lib/progress';
import { CombinedState } from 'reducers';
import { resetErrors } from 'actions/notification-actions';
import { makeBulkOperationAsync, bulkActions } from 'actions/bulk-actions';
import CVATMarkdown from './common/cvat-markdown';

export default function BulkProgress(): JSX.Element | null {
    const dispatch = useDispatch();
    const history = useHistory();
    const { fetching, status, bulkError } = useSelector((state: CombinedState) => ({
        fetching: state.bulkActions.fetching,
        status: state.bulkActions.status,
        bulkError: state.notifications.errors.bulkOperation.processing,
    }));

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
                onClick={() => dispatch(bulkActions.cancelBulkAction())}
                type='primary'
            >
                Cancel
            </Button>
        </div>
    );
}
