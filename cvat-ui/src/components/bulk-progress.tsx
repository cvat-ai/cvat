// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { Progress, Button } from 'antd';
import { useSelector, useDispatch } from 'react-redux';
import { selectionActions } from 'actions/selection-actions';
import { CombinedState } from 'reducers';

export default function BulkProgress(): JSX.Element | null {
    const dispatch = useDispatch();
    const fetching = useSelector((state: CombinedState) => state.selection.fetching);
    const status = useSelector((state: CombinedState) => state.selection.status);

    const percent = status?.percent ?? 0;
    const message = status?.message ?? 'Processing...';

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
