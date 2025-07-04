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
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100vw',
                height: '100vh',
                background: 'rgba(255,255,255,0.7)',
                zIndex: 2000,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column',
            }}
        >
            <Progress type='circle' percent={percent} size={120} />
            <div
                style={{
                    marginTop: 24,
                    fontSize: 18,
                    color: '#333',
                    minHeight: 24,
                }}
            >
                {message}
            </div>
            <Button
                style={{ marginTop: 24 }}
                danger
                onClick={() => dispatch(selectionActions.finishBulkAction())}
            >
                Cancel
            </Button>
        </div>
    );
}
