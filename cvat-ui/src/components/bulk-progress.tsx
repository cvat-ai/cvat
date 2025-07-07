// Copyright (C) CVAT.ai Corporation
// SPDX-License-Identifier: MIT

import React from 'react';
import { Progress, Button } from 'antd';
import { useSelector, useDispatch } from 'react-redux';
import { selectionActions } from 'actions/selection-actions';

export default function BulkProgress(): JSX.Element | null {
    const fetching = useSelector((state: any) => state.selection.fetching);
    const status = useSelector((state: any) => state.selection.status);
    const percent = status?.percent ?? 0;
    const message = status?.message ?? 'Processing...';
    const dispatch = useDispatch();
    if (!fetching) return null;
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
