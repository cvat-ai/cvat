// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { useSelector, useDispatch, shallowEqual } from 'react-redux';
import dayjs from 'dayjs';
import Icon, {
    LeftOutlined, RightOutlined, EyeInvisibleFilled, EyeOutlined,
    CheckCircleFilled, CheckCircleOutlined,
} from '@ant-design/icons';
import { Row, Col } from 'antd/lib/grid';
import Text from 'antd/lib/typography/Text';

import {
    activateObject, fetchAnnotationsAsync, changeFrameAsync, highlightConflict,
} from 'actions/annotation-actions';
import { reviewActions } from 'actions/review-actions';
import CVATTooltip from 'components/common/cvat-tooltip';
import { ActiveControl, CombinedState, Workspace } from 'reducers';
import Paragraph from 'antd/lib/typography/Paragraph';
import { ConflictSeverity, QualityConflict, Issue } from 'cvat-core-wrapper';
import { changeShowGroundTruth } from 'actions/settings-actions';
import { ShowGroundTruthIcon } from 'icons';

export default function LabelsListComponent(): JSX.Element {
    const dispatch = useDispatch();
    const {
        frame,
        frameIssues,
        frameConflicts,
        showGroundTruth,
        issues,
        conflicts,
        issuesHidden,
        issuesResolvedHidden,
        highlightedConflict,
        workspace,
        ready,
        activeControl,
    } = useSelector((state: CombinedState) => ({
        frame: state.annotation.player.frame.number,
        frameIssues: state.review.frameIssues,
        frameConflicts: state.review.frameConflicts,
        showGroundTruth: state.settings.shapes.showGroundTruth,
        issues: state.review.issues,
        conflicts: state.review.conflicts,
        issuesHidden: state.review.issuesHidden,
        issuesResolvedHidden: state.review.issuesResolvedHidden,
        highlightedConflict: state.annotation.annotations.highlightedConflict,
        workspace: state.annotation.workspace,
        ready: state.annotation.canvas.ready,
        activeControl: state.annotation.canvas.activeControl,
    }), shallowEqual);

    let frames = issues
        .filter((issue: Issue) => !issuesResolvedHidden || !issue.resolved)
        .map((issue: Issue) => issue.frame)
        .sort((a: number, b: number) => +a - +b);

    if (showGroundTruth) {
        const conflictFrames = conflicts
            .map((conflict): number => conflict.frame).sort((a: number, b: number) => +a - +b);
        frames = [...new Set([...frames, ...conflictFrames])];
    }
    const nearestLeft = frames.filter((_frame: number): boolean => _frame < frame).reverse()[0];
    const dynamicLeftProps: any = Number.isInteger(nearestLeft) ?
        {
            onClick: () => dispatch(changeFrameAsync(nearestLeft)),
        } :
        {
            style: {
                pointerEvents: 'none',
                opacity: 0.5,
            },
        };

    const nearestRight = frames.filter((_frame: number): boolean => _frame > frame)[0];
    const dynamicRightProps: any = Number.isInteger(nearestRight) ?
        {
            onClick: () => dispatch(changeFrameAsync(nearestRight)),
        } :
        {
            style: {
                pointerEvents: 'none',
                opacity: 0.5,
            },
        };

    return (
        <>
            <div className='cvat-objects-sidebar-issues-list-header'>
                <Row justify='start' align='middle'>
                    <Col>
                        <Text>{`Items: ${frameIssues.length}`}</Text>
                    </Col>
                    <Col offset={1}>
                        <CVATTooltip title='Find the previous frame with issues'>
                            <LeftOutlined className='cvat-issues-sidebar-previous-frame' {...dynamicLeftProps} />
                        </CVATTooltip>
                    </Col>
                    <Col offset={1}>
                        <CVATTooltip title='Find the next frame with issues'>
                            <RightOutlined className='cvat-issues-sidebar-next-frame' {...dynamicRightProps} />
                        </CVATTooltip>
                    </Col>
                    <Col offset={2}>
                        <CVATTooltip title='Show/hide all issues'>
                            {issuesHidden ? (
                                <EyeInvisibleFilled
                                    className='cvat-issues-sidebar-hidden-issues'
                                    onClick={() => dispatch(reviewActions.switchIssuesHiddenFlag(false))}
                                />
                            ) : (
                                <EyeOutlined
                                    className='cvat-issues-sidebar-shown-issues'
                                    onClick={() => dispatch(reviewActions.switchIssuesHiddenFlag(true))}
                                />
                            )}
                        </CVATTooltip>
                    </Col>
                    <Col offset={2}>
                        <CVATTooltip title='Show/hide resolved issues'>
                            { issuesResolvedHidden ? (
                                <CheckCircleFilled
                                    className='cvat-issues-sidebar-hidden-resolved-status'
                                    onClick={() => dispatch(reviewActions.switchIssuesHiddenResolvedFlag(false))}
                                />
                            ) : (
                                <CheckCircleOutlined
                                    className='cvat-issues-sidebar-hidden-resolved-status'
                                    onClick={() => dispatch(reviewActions.switchIssuesHiddenResolvedFlag(true))}
                                />

                            )}
                        </CVATTooltip>
                    </Col>
                    {
                        workspace === Workspace.REVIEW ? (
                            <Col offset={2}>
                                <CVATTooltip title='Show Ground truth annotations and conflicts'>
                                    <Icon
                                        className={
                                            `cvat-objects-sidebar-show-ground-truth ${showGroundTruth ? 'cvat-objects-sidebar-show-ground-truth-active' : ''}`
                                        }
                                        component={ShowGroundTruthIcon}
                                        onClick={() => {
                                            dispatch(changeShowGroundTruth(!showGroundTruth));
                                            dispatch(fetchAnnotationsAsync());
                                        }}
                                    />
                                </CVATTooltip>
                            </Col>
                        ) : null
                    }
                </Row>
            </div>
            <div className='cvat-objects-sidebar-issues-list'>
                {frameIssues.map(
                    (frameIssue: Issue): JSX.Element => {
                        const firstComment = frameIssue.comments[0];
                        const lastComment = frameIssue.comments.slice(-1)[0];
                        return (
                            <div
                                key={frameIssue.id}
                                id={`cvat-objects-sidebar-issue-item-${frameIssue.id}`}
                                className={
                                    `cvat-objects-sidebar-issue-item ${frameIssue.resolved ? 'cvat-objects-sidebar-issue-resolved' : ''}`
                                }
                                onMouseEnter={() => {
                                    const element = window.document.getElementById(
                                        `cvat_canvas_issue_region_${frameIssue.id}`,
                                    );
                                    if (element) {
                                        element.setAttribute('fill', 'url(#cvat_issue_region_pattern_2)');
                                    }
                                    dispatch(activateObject(null, null, null));
                                }}
                                onMouseLeave={() => {
                                    const element = window.document.getElementById(
                                        `cvat_canvas_issue_region_${frameIssue.id}`,
                                    );
                                    if (element) {
                                        element.setAttribute('fill', 'url(#cvat_issue_region_pattern_1)');
                                    }
                                }}
                            >
                                <Row justify='space-between'>
                                    <Col>
                                        <Text strong>
                                            {`#${frameIssue.id} • Issue`}
                                        </Text>
                                    </Col>
                                    <Col offset={1}>
                                        <Text type='secondary'>
                                            {`created ${dayjs(frameIssue.createdDate).fromNow()}`}
                                        </Text>
                                    </Col>
                                </Row>
                                <Row>
                                    <Paragraph ellipsis={{ rows: 2 }}>
                                        {!!firstComment?.owner?.username && (
                                            <Text strong>{`${firstComment.owner.username}: `}</Text>
                                        )}
                                        <Text>{firstComment?.message || ''}</Text>
                                    </Paragraph>
                                </Row>
                                { lastComment !== firstComment && (
                                    <>
                                        <Row justify='start'>
                                            <Col>
                                                <Text strong>&#8230;</Text>
                                            </Col>
                                        </Row>
                                        <Row>
                                            <Paragraph ellipsis={{ rows: 2 }}>
                                                {!!lastComment?.owner?.username && (
                                                    <Text strong>{`${lastComment.owner.username}: `}</Text>
                                                )}
                                                <Text>{lastComment?.message || ''}</Text>
                                            </Paragraph>
                                        </Row>
                                    </>
                                )}
                            </div>
                        );
                    },
                )}
                {showGroundTruth && frameConflicts.map(
                    (frameConflict: QualityConflict): JSX.Element => (
                        <div
                            key={frameConflict.id}
                            id={`cvat-objects-sidebar-conflict-item-${frameConflict.id}`}
                            className={
                                `${frameConflict.severity === ConflictSeverity.WARNING ?
                                    'cvat-objects-sidebar-warning-item' : 'cvat-objects-sidebar-conflict-item'}
                                  ${frameConflict.id === highlightedConflict?.id ? 'cvat-objects-sidebar-item-active' : ''}  `
                            }
                            onMouseEnter={() => {
                                if (ready && activeControl === ActiveControl.CURSOR) {
                                    dispatch(highlightConflict(frameConflict));
                                }
                            }}
                            onMouseLeave={() => {
                                if (ready && activeControl === ActiveControl.CURSOR) {
                                    dispatch(highlightConflict(null));
                                }
                            }}
                        >
                            <Row>
                                <Text strong>
                                    {`#${frameConflict.id} • ${frameConflict.severity === ConflictSeverity.WARNING ?
                                        'Warning' : 'Conflict'}`}
                                </Text>
                            </Row>
                            <Row>
                                <Paragraph ellipsis={{ rows: 2 }}>
                                    {frameConflict.description}
                                </Paragraph>
                                <Text />
                            </Row>
                        </div>
                    ),
                )}
            </div>
        </>
    );
}
