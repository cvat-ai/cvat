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
    const message = status?.message ?? '处理中...';

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
                        部分条目处理失败。您可以对剩余的
                        {` ${remainingItemsCount} 个条目`}重试该操作。
                    </>
                ) : (
                    '批量操作过程中发生错误。'
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
                            重试
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
                取消
            </Button>
        </div>
    );
}

