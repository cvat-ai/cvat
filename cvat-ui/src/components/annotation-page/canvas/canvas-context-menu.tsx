// Copyright (C) 2021-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import ReactDOM from 'react-dom';
import Menu from 'antd/lib/menu';
// eslint-disable-next-line import/no-extraneous-dependencies
import { MenuInfo } from 'rc-menu/lib/interface';

import ObjectItemContainer from 'containers/annotation-page/standard-workspace/objects-side-bar/object-item';
import { Workspace } from 'reducers/interfaces';
import { rotatePoint } from 'utils/math';
import consts from 'consts';
import LabelSelector from 'components/label-selector/label-selector';
import CVATTooltip from 'components/common/cvat-tooltip';

interface Props {
    readonly: boolean;
    workspace: Workspace;
    contextMenuClientIDs: number[];
    objectStates: any[];
    labels: any[];
    visible: boolean;
    left: number;
    top: number;
    onStartIssue(position: number[]): void;
    openIssue(position: number[], message: string): void;
    updateState(states: any[]): void;
    latestComments: string[];
}

interface ReviewContextMenuProps {
    top: number;
    left: number;
    latestComments: string[];
    onClick: (param: MenuInfo) => void;
}

enum ReviewContextMenuKeys {
    OPEN_ISSUE = 'open_issue',
    QUICK_ISSUE_POSITION = 'quick_issue_position',
    QUICK_ISSUE_ATTRIBUTE = 'quick_issue_attribute',
    QUICK_ISSUE_FROM_LATEST = 'quick_issue_from_latest',
}

function ReviewContextMenu({
    top, left, latestComments, onClick,
}: ReviewContextMenuProps): JSX.Element {
    return (
        <Menu onClick={onClick} selectable={false} className='cvat-canvas-context-menu' style={{ top, left }}>
            <Menu.Item className='cvat-context-menu-item' key={ReviewContextMenuKeys.OPEN_ISSUE}>
                Open an issue ...
            </Menu.Item>
            <Menu.Item className='cvat-context-menu-item' key={ReviewContextMenuKeys.QUICK_ISSUE_POSITION}>
                Quick issue: incorrect position
            </Menu.Item>
            <Menu.Item className='cvat-context-menu-item' key={ReviewContextMenuKeys.QUICK_ISSUE_ATTRIBUTE}>
                Quick issue: incorrect attribute
            </Menu.Item>
            {latestComments.length ? (
                <Menu.SubMenu
                    title='Quick issue ...'
                    className='cvat-context-menu-item'
                    key={ReviewContextMenuKeys.QUICK_ISSUE_FROM_LATEST}
                >
                    {latestComments.map(
                        (comment: string, id: number): JSX.Element => (
                            <Menu.Item
                                className='cvat-context-menu-item cvat-quick-issue-from-latest-item'
                                key={`${id}`}
                            >
                                {comment}
                            </Menu.Item>
                        ),
                    )}
                </Menu.SubMenu>
            ) : null}
        </Menu>
    );
}

export default function CanvasContextMenu(props: Props): JSX.Element | null {
    const {
        contextMenuClientIDs,
        objectStates,
        labels,
        visible,
        left,
        top,
        readonly,
        workspace,
        latestComments,
        onStartIssue,
        openIssue,
        updateState,
    } = props;

    if (!visible || !contextMenuClientIDs?.length) {
        return null;
    }

    const changeLabel = (newLabel: any): void => {
        for (const o of objectStates) {
            o.label = newLabel;
        }
        updateState(objectStates);
    };

    if (workspace === Workspace.REVIEW_WORKSPACE) {
        // Doesn't support multi-select yet - only show the first active object
        return ReactDOM.createPortal(
            <ReviewContextMenu
                key={contextMenuClientIDs[0]}
                top={top}
                left={left}
                latestComments={latestComments}
                onClick={(param: MenuInfo) => {
                    const [state] = objectStates.filter(
                        (_state: any): boolean => _state.clientID === contextMenuClientIDs[0],
                    );
                    if (param.key === ReviewContextMenuKeys.OPEN_ISSUE) {
                        if (state) {
                            let { points } = state;
                            if (['ellipse', 'rectangle'].includes(state.shapeType)) {
                                const [cx, cy] = state.shapeType === 'ellipse' ? state.points : [
                                    (state.points[0] + state.points[2]) / 2,
                                    (state.points[1] + state.points[3]) / 2,
                                ];
                                const [rx, ry] = [state.points[2] - cx, cy - state.points[3]];
                                points = state.shapeType === 'ellipse' ? [
                                    state.points[0] - rx,
                                    state.points[1] - ry,
                                    state.points[0] + rx,
                                    state.points[1] + ry,
                                ] : state.points;

                                points = [
                                    [points[0], points[1]],
                                    [points[2], points[1]],
                                    [points[2], points[3]],
                                    [points[0], points[3]],
                                ].map(([x, y]: number[]) => rotatePoint(x, y, state.rotation, cx, cy)).flat();
                            }

                            onStartIssue(points);
                        }
                    } else if (param.key === ReviewContextMenuKeys.QUICK_ISSUE_POSITION) {
                        if (state) {
                            openIssue(state.points, consts.QUICK_ISSUE_INCORRECT_POSITION_TEXT);
                        }
                    } else if (param.key === ReviewContextMenuKeys.QUICK_ISSUE_ATTRIBUTE) {
                        if (state) {
                            openIssue(state.points, consts.QUICK_ISSUE_INCORRECT_ATTRIBUTE_TEXT);
                        }
                    } else if (
                        param.keyPath.length === 2 &&
                        param.keyPath[1] === ReviewContextMenuKeys.QUICK_ISSUE_FROM_LATEST
                    ) {
                        if (state) {
                            openIssue(state.points, latestComments[+param.keyPath[0]]);
                        }
                    }
                }}
            />,
            window.document.body,
        );
    }

    return ReactDOM.createPortal(
        <div className='cvat-canvas-context-menu' style={{ top, left }}>

            {contextMenuClientIDs.length > 1 && (
                <CVATTooltip title='Change all labels'>
                    <span>Change all labels: </span>
                    <LabelSelector
                        disabled={readonly}
                        size='small'
                        labels={labels}
                        value={null}
                        onChange={changeLabel}
                        className='cvat-objects-sidebar-state-item-label-selector'
                    />
                </CVATTooltip>
            )}

            {contextMenuClientIDs.map(
                (id: number): JSX.Element => (
                    <ObjectItemContainer
                        readonly={readonly}
                        activateOnClick={false}
                        key={id}
                        clientID={id}
                        objectStates={objectStates}
                        initialCollapsed
                    />
                ),
            )}
        </div>,
        window.document.body,
    );
}
