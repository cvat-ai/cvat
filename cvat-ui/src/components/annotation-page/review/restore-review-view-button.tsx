// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { useSelector } from 'react-redux';
import Button from 'antd/lib/button';
import { Canvas3d } from 'cvat-canvas3d-wrapper';
import { IssueView } from 'cvat-core-wrapper';
import { ActiveControl, CombinedState } from 'reducers';
import { shallowEqual } from 'utils/redux';

export default function RestoreReviewViewButton({ view }: {
    view: IssueView | null;
}): JSX.Element | null {
    const {
        canvas, ready, activeControl, navigationBlocked,
    } = useSelector((state: CombinedState) => ({
        canvas: state.annotation.canvas.instance,
        ready: state.annotation.canvas.ready,
        activeControl: state.annotation.canvas.activeControl,
        navigationBlocked: state.annotation.player.navigationBlocked,
    }), shallowEqual);
    if (!view || !(canvas instanceof Canvas3d)) return null;

    return (
        <Button
            className='cvat-issue-restore-view'
            type='link'
            size='small'
            disabled={!ready || activeControl !== ActiveControl.CURSOR || navigationBlocked}
            onClick={(event) => {
                event.stopPropagation();
                canvas.restoreReviewView(view);
            }}
        >
            Restore review view
        </Button>
    );
}
