// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import ReactDOM from 'react-dom';
import Menu from 'antd/lib/menu';
// eslint-disable-next-line import/no-extraneous-dependencies
import { MenuInfo } from 'rc-menu/lib/interface';

import ObjectItemElementComponent from 'components/annotation-page/standard-workspace/objects-side-bar/object-item-element';
import ObjectItemContainer from 'containers/annotation-page/standard-workspace/objects-side-bar/object-item';
import { ShapeType, Workspace } from 'reducers';
import { rotatePoint } from 'utils/math';
import config from 'config';
import { AnnotationConflict, ObjectState, QualityConflict } from 'cvat-core-wrapper';

interface Props {
    readonly: boolean;
    workspace: Workspace;
    contextMenuParentID: number | null;
    contextMenuClientID: number | null;
    objectStates: any[];
    frameConflicts: QualityConflict[];
    visible: boolean;
    left: number;
    top: number;
    latestComments: string[];
    onStartIssue(position: number[]): void;
    openIssue(position: number[], message: string): void;
    onCopyObject(objectState: ObjectState): void;
}

interface ReviewContextMenuProps {
    top: number;
    left: number;
    latestComments: string[];
    conflict?: QualityConflict;
    copyObject: ObjectState | null;
    onClick: (param: MenuInfo) => void;
}

enum ReviewContextMenuKeys {
    OPEN_ISSUE = 'open_issue',
    QUICK_ISSUE_POSITION = 'quick_issue_position',
    QUICK_ISSUE_ATTRIBUTE = 'quick_issue_attribute',
    QUICK_ISSUE_FROM_LATEST = 'quick_issue_from_latest',
    QUICK_ISSUE_FROM_CONFLICT = 'quick_issue_from_conflict',
    COPY_OBJECT = 'copy_object',
}

function ReviewContextMenu({
    top, left, latestComments, conflict, copyObject, onClick,
}: ReviewContextMenuProps): JSX.Element {
    return (
        <Menu onClick={onClick} selectable={false} className='cvat-canvas-context-menu' style={{ top, left }}>
            <Menu.Item className='cvat-context-menu-item' key={ReviewContextMenuKeys.OPEN_ISSUE}>
                Open an issue ...
            </Menu.Item>
            {conflict ? (
                <Menu.Item
                    className='cvat-context-menu-item cvat-quick-issue-from-conflict'
                    key={ReviewContextMenuKeys.QUICK_ISSUE_FROM_CONFLICT}
                >
                    {`Quick issue: ${conflict.description}`}
                </Menu.Item>
            ) : null}
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
            {copyObject ? (
                <Menu.Item
                    className='cvat-context-menu-item cvat-quick-copy-object'
                    key={ReviewContextMenuKeys.COPY_OBJECT}
                >
                    Copy annotation
                </Menu.Item>
            ) : null}
        </Menu>
    );
}

export default function CanvasContextMenu(props: Props): JSX.Element | null {
    const {
        contextMenuClientID,
        contextMenuParentID,
        objectStates,
        frameConflicts,
        visible,
        left,
        top,
        readonly,
        workspace,
        latestComments,
        onStartIssue,
        openIssue,
        onCopyObject,
    } = props;

    if (!visible || contextMenuClientID === null) {
        return null;
    }

    let state = objectStates
        .find((_state: ObjectState) => _state.clientID === (contextMenuParentID || contextMenuClientID));
    if (contextMenuParentID !== null) {
        state = state.elements.find((_state: ObjectState) => _state.clientID === contextMenuClientID);
    }

    const copyObject = state?.isGroundTruth ? state : null;
    if (workspace === Workspace.REVIEW) {
        const conflict = frameConflicts
            .find((qualityConflict: QualityConflict) => qualityConflict.annotationConflicts.some(
                (annotationConflict: AnnotationConflict) => (
                    state && annotationConflict.serverID === state.serverID &&
                    annotationConflict.type === state.objectType
                ),
            ));

        return ReactDOM.createPortal(
            <ReviewContextMenu
                key={contextMenuClientID}
                top={top}
                left={left}
                conflict={conflict}
                copyObject={copyObject}
                latestComments={latestComments}
                onClick={(param: MenuInfo) => {
                    if (state) {
                        let { points } = state;
                        if ([ShapeType.ELLIPSE, ShapeType.RECTANGLE].includes(state.shapeType)) {
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
                        } else if (state.shapeType === ShapeType.MASK) {
                            points = state.points.slice(-4);
                            points = [
                                points[0], points[1],
                                points[2], points[1],
                                points[2], points[3],
                                points[0], points[3],
                            ];
                        }

                        if (param.key === ReviewContextMenuKeys.OPEN_ISSUE) {
                            onStartIssue(points);
                        } else if (param.key === ReviewContextMenuKeys.QUICK_ISSUE_POSITION) {
                            openIssue(points, config.QUICK_ISSUE_INCORRECT_POSITION_TEXT);
                        } else if (param.key === ReviewContextMenuKeys.QUICK_ISSUE_ATTRIBUTE) {
                            openIssue(points, config.QUICK_ISSUE_INCORRECT_ATTRIBUTE_TEXT);
                        } else if (param.key === ReviewContextMenuKeys.QUICK_ISSUE_FROM_CONFLICT) {
                            if (conflict) openIssue(points, conflict.description);
                        } else if (param.key === ReviewContextMenuKeys.COPY_OBJECT) {
                            if (copyObject) onCopyObject(copyObject);
                        } else if (
                            param.keyPath.length === 2 &&
                            param.keyPath[1] === ReviewContextMenuKeys.QUICK_ISSUE_FROM_LATEST
                        ) {
                            openIssue(points, latestComments[+param.keyPath[0]]);
                        }
                    }
                }}
            />,
            window.document.body,
        );
    }

    if (Number.isInteger(contextMenuParentID)) {
        return ReactDOM.createPortal(
            <div className='cvat-canvas-context-menu' style={{ top, left }}>
                <ObjectItemElementComponent
                    readonly={readonly}
                    key={contextMenuClientID}
                    clientID={contextMenuClientID}
                    parentID={contextMenuParentID as number}
                />
            </div>,
            window.document.body,
        );
    }

    return ReactDOM.createPortal(
        <div className='cvat-canvas-context-menu' style={{ top, left }}>
            <ObjectItemContainer
                readonly={readonly}
                key={contextMenuClientID}
                clientID={contextMenuClientID}
                objectStates={objectStates}
            />
        </div>,
        window.document.body,
    );
}
