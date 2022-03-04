// Copyright (C) 2020-2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
    LeftOutlined, RightOutlined, EyeInvisibleFilled, EyeOutlined,
    CheckCircleFilled, CheckCircleOutlined,
} from '@ant-design/icons';
import Alert from 'antd/lib/alert';
import { Row, Col } from 'antd/lib/grid';

import { changeFrameAsync } from 'actions/annotation-actions';
import { reviewActions } from 'actions/review-actions';
import CVATTooltip from 'components/common/cvat-tooltip';
import { CombinedState } from 'reducers/interfaces';

export default function LabelsListComponent(): JSX.Element {
    const dispatch = useDispatch();
    const frame = useSelector((state: CombinedState): number => state.annotation.player.frame.number);
    const frameIssues = useSelector((state: CombinedState): any[] => state.review.frameIssues);
    const issues = useSelector((state: CombinedState): any[] => state.review.issues);
    const issuesHidden = useSelector((state: CombinedState): any => state.review.issuesHidden);
    const issuesResolvedHidden = useSelector((state: CombinedState): any => state.review.issuesResolvedHidden);
    const frames = issues.map((issue: any): number => issue.frame).sort((a: number, b: number) => +a - +b);
    const nearestLeft = frames.filter((_frame: number): boolean => _frame < frame).reverse()[0];
    const dinamicLeftProps: any = Number.isInteger(nearestLeft) ?
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
    const dinamicRightProps: any = Number.isInteger(nearestRight) ?
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
                        <CVATTooltip title='Find the previous frame with issues'>
                            <LeftOutlined className='cvat-issues-sidebar-previous-frame' {...dinamicLeftProps} />
                        </CVATTooltip>
                    </Col>
                    <Col offset={1}>
                        <CVATTooltip title='Find the next frame with issues'>
                            <RightOutlined className='cvat-issues-sidebar-next-frame' {...dinamicRightProps} />
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
                </Row>
            </div>
            <div className='cvat-objects-sidebar-issues-list'>
                {frameIssues.map(
                    (frameIssue: any): JSX.Element => (
                        <div
                            key={frameIssue.id}
                            id={`cvat-objects-sidebar-issue-item-${frameIssue.id}`}
                            className='cvat-objects-sidebar-issue-item'
                            onMouseEnter={() => {
                                const element = window.document.getElementById(
                                    `cvat_canvas_issue_region_${frameIssue.id}`,
                                );
                                if (element) {
                                    element.setAttribute('fill', 'url(#cvat_issue_region_pattern_2)');
                                }
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
                            {frameIssue.resolved ? (
                                <Alert message='Resolved' type='success' showIcon />
                            ) : (
                                <Alert message='Opened' type='warning' showIcon />
                            )}
                        </div>
                    ),
                )}
            </div>
        </>
    );
}
