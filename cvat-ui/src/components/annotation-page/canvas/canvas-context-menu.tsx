// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import ReactDOM from 'react-dom';
import Menu, { ClickParam } from 'antd/lib/menu';

import ObjectItemContainer from 'containers/annotation-page/standard-workspace/objects-side-bar/object-item';
import { Workspace } from 'reducers/interfaces';

interface Props {
    readonly: boolean;
    workspace: Workspace;
    contextMenuClientID: number | null;
    objectStates: any[];
    visible: boolean;
    left: number;
    top: number;
    onStartIssue(position: number[]): void;
    openIssue(position: number[], message: string): void;
}

interface ReviewContextMenuProps {
    top: number;
    left: number;
    onClick: (param: ClickParam) => void;
}

enum ReviewContextMenuKeys {
    OPEN_ISSUE = 'open_issue',
    QUICK_ISSUE_POSITION = 'quick_issue_position',
    QUICK_ISSUE_ATTRIBUTE = 'quick_issue_attribute',
}

function ReviewContextMenu({ top, left, onClick }: ReviewContextMenuProps): JSX.Element {
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
        </Menu>
    );
}

export default function CanvasContextMenu(props: Props): JSX.Element | null {
    const {
        contextMenuClientID,
        objectStates,
        visible,
        left,
        top,
        readonly,
        workspace,
        onStartIssue,
        openIssue,
    } = props;

    if (!visible || contextMenuClientID === null) {
        return null;
    }

    if (workspace === Workspace.REVIEW_WORKSPACE) {
        return ReactDOM.createPortal(
            <ReviewContextMenu
                key={contextMenuClientID}
                top={top}
                left={left}
                onClick={(param: ClickParam) => {
                    const [state] = objectStates.filter(
                        (_state: any): boolean => _state.clientID === contextMenuClientID,
                    );
                    if (param.key === ReviewContextMenuKeys.OPEN_ISSUE) {
                        if (state) {
                            onStartIssue(state.points);
                        }
                    } else if (param.key === ReviewContextMenuKeys.QUICK_ISSUE_POSITION) {
                        if (state) {
                            openIssue(state.points, 'Wrong position');
                        }
                    } else if (param.key === ReviewContextMenuKeys.QUICK_ISSUE_ATTRIBUTE) {
                        if (state) {
                            openIssue(state.points, 'Wrong attribute');
                        }
                    }
                }}
            />,
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
                initialCollapsed
            />
        </div>,
        window.document.body,
    );
}
