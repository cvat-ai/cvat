// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { useSelector } from 'react-redux';

import { projectPoint } from 'cvat-canvas3d-wrapper';
import { CombinedState } from 'reducers';
import { getRelatedImageMetadata } from 'utils/related-image-calibrations';
import { shallowEqual } from 'utils/redux';
import type { ContextImageOverlayProps } from './context-image';
import { CuboidProjection } from './hooks/use-3d-cuboid-projections';

export default function IssueProjections({
    contextImageName, imageSize, scale,
}: ContextImageOverlayProps): JSX.Element | null {
    const {
        ready, frameIssues, issuesHidden, issuesResolvedHidden, activeIssueId, highlightedIssueId, draft, calibration,
    } = useSelector((state: CombinedState) => ({
        ready: state.annotation.canvas.ready,
        frameIssues: state.review.frameIssues,
        issuesHidden: state.review.issuesHidden,
        issuesResolvedHidden: state.review.issuesResolvedHidden,
        activeIssueId: state.review.activeIssueId,
        highlightedIssueId: state.review.highlightedIssueId,
        draft: state.review.newIssue.position,
        calibration: getRelatedImageMetadata(
            state.annotation.player.frame.data?.calibratedRelatedImagesMetadata || [], contextImageName,
        ),
    }), shallowEqual);

    if (!ready || !calibration) return null;

    const issues = issuesHidden ? [] : frameIssues.filter((issue) => (
        !issue.resolved || (!issuesResolvedHidden && (issue.id === activeIssueId || issue.id === highlightedIssueId))
    ));
    const regions = draft ? [...issues, { id: 0, position: draft }] : issues;
    const { width, height } = imageSize;

    return (
        <g className='cvat-context-image-issue-projections' pointerEvents='none' aria-hidden='true'>
            {regions.map(({ id, position }) => {
                const highlighted = id === activeIssueId || id === highlightedIssueId;
                if (position.length === 16) {
                    const color = highlighted ? 'yellow' : 'red';
                    return (
                        <g className='cvat-context-image-issue-cuboid' key={id} data-issue-id={id}>
                            <CuboidProjection
                                calibration={calibration}
                                cuboidPoints={position}
                                color={color}
                                opacity={0.2}
                                outlined={false}
                                outlineColor={color}
                                occluded={false}
                                scale={scale}
                            />
                        </g>
                    );
                }

                const pixel = projectPoint(calibration, position);
                if (!pixel || pixel[0] < 0 || pixel[0] >= width || pixel[1] < 0 || pixel[1] >= height) return null;
                return (
                    <circle
                        key={id}
                        className='cvat-context-image-issue-point'
                        data-issue-id={id}
                        cx={pixel[0]}
                        cy={pixel[1]}
                        r={4 / scale}
                        fill={highlighted ? '#40a9ff' : '#d9b300'}
                        stroke='rgba(0, 0, 0, 0.7)'
                        strokeWidth={1 / scale}
                    />
                );
            })}
        </g>
    );
}
