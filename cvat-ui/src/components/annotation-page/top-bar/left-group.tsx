// Copyright (C) 2020-2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { connect } from 'react-redux';
import { Col } from 'antd/lib/grid';
import Icon, { StopOutlined, CheckOutlined } from '@ant-design/icons';
import Modal from 'antd/lib/modal';
import Button from 'antd/lib/button';
import Timeline from 'antd/lib/timeline';
import Dropdown from 'antd/lib/dropdown';

import AnnotationMenuContainer from 'containers/annotation-page/top-bar/annotation-menu';
import {
    MainMenuIcon, SaveIcon, UndoIcon, RedoIcon,
} from 'icons';
import { ActiveControl, CombinedState, BlockMode } from 'reducers/interfaces';
import CVATTooltip from 'components/common/cvat-tooltip';

interface Props {
    saving: boolean;
    savingStatuses: string[];
    undoAction?: string;
    redoAction?: string;
    saveShortcut: string;
    undoShortcut: string;
    redoShortcut: string;
    drawShortcut: string;
    blockShortcut: string;
    blockMode: BlockMode;
    activeControl: ActiveControl;
    onSaveAnnotation(): void;
    onUndoClick(): void;
    onRedoClick(): void;
    onFinishDraw(): void;
    onSwitchBlockMode(): void;
}

interface StateToProps {
    blockMode: BlockMode;
}

function mapStateToProps(state: CombinedState): StateToProps {
    const {
        settings: {
            workspace: {
                blockMode,
            },
        },
    } = state;

    return {
        blockMode,
    };
}

function LeftGroup(props: Props): JSX.Element {
    const {
        saving,
        savingStatuses,
        undoAction,
        redoAction,
        saveShortcut,
        undoShortcut,
        redoShortcut,
        drawShortcut,
        blockShortcut,
        activeControl,
        blockMode,
        onSaveAnnotation,
        onUndoClick,
        onRedoClick,
        onFinishDraw,
        onSwitchBlockMode,
    } = props;

    const includesDoneButton = [
        ActiveControl.DRAW_POLYGON,
        ActiveControl.DRAW_POLYLINE,
        ActiveControl.DRAW_POINTS,
        ActiveControl.AI_TOOLS,
        ActiveControl.OPENCV_TOOLS,
    ].includes(activeControl);

    const includesBlockButton = [
        ActiveControl.OPENCV_TOOLS,
        ActiveControl.AI_TOOLS,
    ].includes(activeControl) && blockMode.showButton;

    return (
        <Col className='cvat-annotation-header-left-group'>
            <Dropdown overlay={<AnnotationMenuContainer />}>
                <Button type='link' className='cvat-annotation-header-button'>
                    <Icon component={MainMenuIcon} />
                    Menu
                </Button>
            </Dropdown>
            <CVATTooltip overlay={`Save current changes ${saveShortcut}`}>
                <Button
                    onClick={saving ? undefined : onSaveAnnotation}
                    type='link'
                    className={saving ? 'cvat-annotation-disabled-header-button' : 'cvat-annotation-header-button'}
                >
                    <Icon component={SaveIcon} />
                    {saving ? 'Saving...' : 'Save'}
                    <Modal title='Saving changes on the server' visible={saving} footer={[]} closable={false}>
                        <Timeline pending={savingStatuses[savingStatuses.length - 1] || 'Pending..'}>
                            {savingStatuses.slice(0, -1).map((status: string, id: number) => (
                                <Timeline.Item key={id}>{status}</Timeline.Item>
                            ))}
                        </Timeline>
                    </Modal>
                </Button>
            </CVATTooltip>
            <CVATTooltip overlay={`Undo: ${undoAction} ${undoShortcut}`}>
                <Button
                    style={{ pointerEvents: undoAction ? 'initial' : 'none', opacity: undoAction ? 1 : 0.5 }}
                    type='link'
                    className='cvat-annotation-header-button'
                    onClick={onUndoClick}
                >
                    <Icon component={UndoIcon} />
                    <span>Undo</span>
                </Button>
            </CVATTooltip>
            <CVATTooltip overlay={`Redo: ${redoAction} ${redoShortcut}`}>
                <Button
                    style={{ pointerEvents: redoAction ? 'initial' : 'none', opacity: redoAction ? 1 : 0.5 }}
                    type='link'
                    className='cvat-annotation-header-button'
                    onClick={onRedoClick}
                >
                    <Icon component={RedoIcon} />
                    Redo
                </Button>
            </CVATTooltip>
            {includesDoneButton ? (
                <CVATTooltip overlay={`Press "${drawShortcut}" to finish`}>
                    <Button type='link' className='cvat-annotation-header-button' onClick={onFinishDraw}>
                        <CheckOutlined />
                        Done
                    </Button>
                </CVATTooltip>
            ) : null}
            {includesBlockButton ? (
                <CVATTooltip overlay={`Postpone running the algorithm "${blockShortcut}"`}>
                    <Button type='link' className={`cvat-annotation-header-button ${blockMode.enabled ? 'cvat-button-active' : ''}`} onClick={onSwitchBlockMode}>
                        <StopOutlined />
                        Block
                    </Button>
                </CVATTooltip>
            ) : null}
        </Col>
    );
}

export default connect(mapStateToProps)(LeftGroup);
