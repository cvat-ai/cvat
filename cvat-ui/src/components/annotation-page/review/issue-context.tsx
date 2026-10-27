// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Button from 'antd/lib/button';
import Text from 'antd/lib/typography/Text';
import { activateObject } from 'actions/annotation-actions';
import { Canvas3d } from 'cvat-canvas3d-wrapper';
import { DimensionType, Issue, ObjectType } from 'cvat-core-wrapper';
import { CombinedState } from 'reducers';
import { shallowEqual } from 'utils/redux';

export default function IssueContext({ issue, interactive = false }: {
    issue: Issue;
    interactive?: boolean;
}): JSX.Element | null {
    const dispatch = useDispatch();
    const { objects, canvas, is3D } = useSelector((state: CombinedState) => ({
        objects: state.annotation.annotations.states,
        canvas: state.annotation.canvas.instance,
        is3D: state.annotation.job.instance.dimension === DimensionType.DIMENSION_3D,
    }), shallowEqual);
    if (!is3D) return null;

    const object = issue.objectID === null ? null : objects.find((candidate) => !candidate.isGroundTruth &&
        candidate.serverID === issue.objectID && candidate.objectType === issue.objectType && !candidate.outside);
    const kind = issue.objectType === ObjectType.TRACK ? 'Track' : 'Shape';
    const target = object ? `${object.label.name} · ${kind} #${object.clientID}` :
        `Linked ${kind.toLowerCase()} unavailable on this frame`;

    return (
        <div className='cvat-issue-context'>
            <Text type='secondary'>
                {issue.endFrame === issue.frame ? `Frame ${issue.frame}` : `Frames ${issue.frame}–${issue.endFrame}`}
            </Text>
            {issue.objectID !== null && (interactive && object ? (
                <Button
                    className='cvat-issue-select-object'
                    type='link'
                    size='small'
                    onClick={(event) => {
                        event.stopPropagation();
                        dispatch(activateObject(object.clientID, null, null));
                        if (canvas instanceof Canvas3d) canvas.focusPosition(object.points.slice(0, 3));
                    }}
                >
                    {`Select ${target}`}
                </Button>
            ) : <Text type='secondary'>{target}</Text>)}
        </div>
    );
}
