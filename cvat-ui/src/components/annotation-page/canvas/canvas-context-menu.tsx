// Copyright (C) 2021-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React, { useRef } from 'react';
import ReactDOM from 'react-dom';
import Menu from 'antd/lib/menu';
// eslint-disable-next-line import/no-extraneous-dependencies
import { MenuInfo } from 'rc-menu/lib/interface';
import Text from 'antd/lib/typography/Text';

import AutoSizer from 'react-virtualized-auto-sizer';
import { VariableSizeList as List } from 'react-window';
import ObjectItemContainer from 'containers/annotation-page/standard-workspace/objects-side-bar/object-item';
import { Workspace } from 'reducers';
import { rotatePoint } from 'utils/math';
import consts from 'consts';
import LabelSelector from 'components/label-selector/label-selector';
import CVATTooltip from 'components/common/cvat-tooltip';
import { Row, Col } from 'antd';
import { getRowSize } from 'containers/annotation-page/standard-workspace/objects-side-bar/object-list-sorter';
import ObjectState from 'cvat-core/src/object-state';

interface Props {
    readonly: boolean;
    workspace: Workspace;
    contextMenuParentID: number | null;
    contextMenuClientIDs: number[];
    objectStates: any[];
    collapsedStates: Record<number, boolean>;
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
        collapsedStates,
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

    const listRef = useRef();
    if (listRef?.current) {
        listRef.current.resetAfterIndex(0, false);
    }

    const displayedObjects: ObjectState[] = [];
    for (const id of contextMenuClientIDs) {
        const obj = objectStates.find((o) => o.clientID === id);
        if (obj) {
            displayedObjects.push(obj);
        }
    }

    const changeLabels = (newLabel: any): void => {
        for (const o of displayedObjects) {
            o.label = newLabel;
        }
        updateState(objectStates);
    };

    return ReactDOM.createPortal(
        <div className='cvat-canvas-context-menu' style={{ top, left }}>

            {contextMenuClientIDs.length > 1 && (
                <div className='change-all-labels-container'>
                    <>
                        <Row align='middle'>
                            <Col span={10}>
                                <Text type='secondary'>Change all labels:</Text>
                            </Col>
                            <Col span={12}>
                                <CVATTooltip title='Change all labels'>
                                    <LabelSelector
                                        style={{ width: '100%' }}
                                        disabled={readonly}
                                        size='small'
                                        labels={labels}
                                        value={null}
                                        onChange={changeLabels}
                                        className='cvat-canvas-context-menu-change-all-labels-selector'
                                    />
                                </CVATTooltip>
                            </Col>
                            <Col span={2} />
                        </Row>
                    </>
                </div>
            )}

            <AutoSizer>
                {({ height, width }) => (
                    <List
                        itemCount={displayedObjects.length}
                        itemSize={(index: number) => getRowSize(displayedObjects, collapsedStates, index)}
                        height={height}
                        width={width}
                        ref={listRef}
                    >
                        {({ index, style }): JSX.Element => (
                            <div style={style}>
                                <ObjectItemContainer
                                    readonly={readonly}
                                    activateOnClick={false}
                                    key={displayedObjects[index].clientID}
                                    objectState={displayedObjects[index]}
                                    initialCollapsed
                                />
                            </div>
                        )}
                    </List>
                )}
            </AutoSizer>
        </div>,
        window.document.body,
    );
}
