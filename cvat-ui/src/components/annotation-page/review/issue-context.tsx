// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { useSelector } from 'react-redux';
import Button from 'antd/lib/button';
import { Canvas3d } from 'cvat-canvas3d-wrapper';
import { DimensionType, Issue } from 'cvat-core-wrapper';
import { ActiveControl, CombinedState } from 'reducers';
import { shallowEqual } from 'utils/redux';

export default function IssueContext({ issue }: {
    issue: Issue;
}): JSX.Element | null {
    const {
        canvas, is3D, ready, activeControl, navigationBlocked,
    } = useSelector((state: CombinedState) => ({
        canvas: state.annotation.canvas.instance,
        is3D: state.annotation.job.instance.dimension === DimensionType.DIMENSION_3D,
        ready: state.annotation.canvas.ready,
        activeControl: state.annotation.canvas.activeControl,
        navigationBlocked: state.annotation.player.navigationBlocked,
    }), shallowEqual);
    if (!is3D || !issue.view || !(canvas instanceof Canvas3d)) return null;

    return (
        <Button
            className='cvat-issue-restore-view'
            type='link'
            size='small'
            disabled={!ready || activeControl !== ActiveControl.CURSOR || navigationBlocked}
            onClick={(event) => {
                event.stopPropagation();
                canvas.restoreReviewView(issue.view);
            }}
        >
            Restore review view
        </Button>
    );
}
