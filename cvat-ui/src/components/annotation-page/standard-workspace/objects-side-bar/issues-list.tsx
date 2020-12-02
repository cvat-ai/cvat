// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { CombinedState } from 'reducers/interfaces';
import Icon, { IconProps } from 'antd/lib/icon';
import Tooltip from 'antd/lib/tooltip';
import Alert from 'antd/lib/alert';
import { Row, Col } from 'antd/lib/grid';

import { changeFrameAsync } from 'actions/annotation-actions';
import { reviewActions } from 'actions/review-actions';

export default function LabelsListComponent(): JSX.Element {
    const dispatch = useDispatch();
    const tabContentHeight = useSelector((state: CombinedState) => state.annotation.tabContentHeight);
    const frame = useSelector((state: CombinedState): number => state.annotation.player.frame.number);
    const frameIssues = useSelector((state: CombinedState): any[] => state.review.frameIssues);
    const issues = useSelector((state: CombinedState): any[] => state.review.issues);
    const activeReview = useSelector((state: CombinedState): any => state.review.activeReview);
    const issuesHidden = useSelector((state: CombinedState): any => state.review.issuesHidden);
    const combinedIssues = activeReview ? issues.concat(activeReview.issues) : issues;
    const frames = combinedIssues.map((issue: any): number => issue.frame).sort((a: number, b: number) => +a - +b);
    const nearestLeft = frames.filter((_frame: number): boolean => _frame < frame).reverse()[0];
    const dinamicLeftProps: IconProps = Number.isInteger(nearestLeft) ?
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
    const dinamicRightProps: IconProps = Number.isInteger(nearestRight) ?
        {
            onClick: () => dispatch(changeFrameAsync(nearestRight)),
        } :
        {
            style: {
                pointerEvents: 'none',
                opacity: 0.5,
            },
        };

    const dinamicShowHideProps: IconProps = issuesHidden ?
        {
            onClick: () => dispatch(reviewActions.switchIssuesHiddenFlag(false)),
            type: 'eye-invisible',
        } :
        {
            onClick: () => dispatch(reviewActions.switchIssuesHiddenFlag(true)),
            type: 'eye',
        };

    return (
        <div style={{ height: tabContentHeight }}>
            <div className='cvat-objects-sidebar-issues-list-header'>
                <Row type='flex' justify='start' align='middle'>
                    <Col>
                        <Tooltip title='Find the previous frame with issues'>
                            <Icon type='left' {...dinamicLeftProps} />
                        </Tooltip>
                    </Col>
                    <Col offset={1}>
                        <Tooltip title='Find the next frame with issues'>
                            <Icon type='right' {...dinamicRightProps} />
                        </Tooltip>
                    </Col>
                    <Col offset={3}>
                        <Tooltip title='Show/hide all the issues'>
                            <Icon {...dinamicShowHideProps} />
                        </Tooltip>
                    </Col>
                </Row>
            </div>
            <div className='cvat-objects-sidebar-issues-list'>
                {frameIssues.map(
                    (frameIssue: any): JSX.Element => (
                        <div
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
                            {frameIssue.resolver ? (
                                <Alert
                                    description={<span>{`By ${frameIssue.resolver.username}`}</span>}
                                    message='Resolved'
                                    type='success'
                                    showIcon
                                />
                            ) : (
                                <Alert
                                    description={<span>{`By ${frameIssue.owner.username}`}</span>}
                                    message='Opened'
                                    type='warning'
                                    showIcon
                                />
                            )}
                        </div>
                    ),
                )}
            </div>
        </div>
    );
}
