// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { Col } from 'antd/lib/grid';
import Icon, { StopOutlined, CheckCircleOutlined, LoadingOutlined } from '@ant-design/icons';
import Modal from 'antd/lib/modal';
import Button from 'antd/lib/button';
import Text from 'antd/lib/typography/Text';
import Dropdown from 'antd/lib/dropdown';

import AnnotationMenuContainer from 'containers/annotation-page/top-bar/annotation-menu';
import {
    MainMenuIcon, SaveIcon, UndoIcon, RedoIcon,
} from 'icons';
import { ActiveControl, ToolsBlockerState } from 'reducers';
import CVATTooltip from 'components/common/cvat-tooltip';

interface Props {
    saving: boolean;
    undoAction?: string;
    redoAction?: string;
    saveShortcut: string;
    undoShortcut: string;
    redoShortcut: string;
    drawShortcut: string;
    switchToolsBlockerShortcut: string;
    toolsBlockerState: ToolsBlockerState;
    activeControl: ActiveControl;
    onSaveAnnotation(): void;
    onUndoClick(): void;
    onRedoClick(): void;
    onFinishDraw(): void;
    onSwitchToolsBlockerState(): void;
}

function LeftGroup(props: Props): JSX.Element {
    const {
        saving,
        undoAction,
        redoAction,
        saveShortcut,
        undoShortcut,
        redoShortcut,
        drawShortcut,
        switchToolsBlockerShortcut,
        activeControl,
        toolsBlockerState,
        onSaveAnnotation,
        onUndoClick,
        onRedoClick,
        onFinishDraw,
        onSwitchToolsBlockerState,
    } = props;

    const includesDoneButton = [
        ActiveControl.DRAW_POLYGON,
        ActiveControl.DRAW_POLYLINE,
        ActiveControl.DRAW_POINTS,
        ActiveControl.AI_TOOLS,
        ActiveControl.OPENCV_TOOLS,
    ].includes(activeControl);

    const includesToolsBlockerButton =
        [ActiveControl.OPENCV_TOOLS, ActiveControl.AI_TOOLS].includes(activeControl) && toolsBlockerState.buttonVisible;

    const shouldEnableToolsBlockerOnClick = [ActiveControl.OPENCV_TOOLS].includes(activeControl);

    return (
        <>
            <Modal className='cvat-saving-job-modal' title='Saving changes on the server' visible={saving} footer={[]} closable={false}>
                <Text>CVAT is saving your annotations, please wait </Text>
                <LoadingOutlined />
            </Modal>
            <Col className='cvat-annotation-header-left-group'>
                <Dropdown overlay={<AnnotationMenuContainer />}>
                    <Button type='link' className='cvat-annotation-header-menu-button cvat-annotation-header-button'>
                        <Icon component={MainMenuIcon} />
                        Menu
                    </Button>
                </Dropdown>
                <CVATTooltip overlay={`Save current changes ${saveShortcut}`}>
                    <Button
                        onClick={saving ? undefined : onSaveAnnotation}
                        type='link'
                        className={saving ? 'cvat-annotation-header-save-button cvat-annotation-disabled-header-button' :
                            'cvat-annotation-header-save-button cvat-annotation-header-button'}
                    >
                        <Icon component={SaveIcon} />
                        {saving ? 'Saving...' : 'Save'}
                    </Button>
                </CVATTooltip>
                <CVATTooltip overlay={`Undo: ${undoAction} ${undoShortcut}`}>
                    <Button
                        style={{ pointerEvents: undoAction ? 'initial' : 'none', opacity: undoAction ? 1 : 0.5 }}
                        type='link'
                        className='cvat-annotation-header-undo-button cvat-annotation-header-button'
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
                        className='cvat-annotation-header-redo-button cvat-annotation-header-button'
                        onClick={onRedoClick}
                    >
                        <Icon component={RedoIcon} />
                        Redo
                    </Button>
                </CVATTooltip>
                {includesDoneButton ? (
                    <CVATTooltip overlay={`Press "${drawShortcut}" to finish`}>
                        <Button type='link' className='cvat-annotation-header-done-button cvat-annotation-header-button' onClick={onFinishDraw}>
                            <CheckCircleOutlined />
                            Done
                        </Button>
                    </CVATTooltip>
                ) : null}
                {includesToolsBlockerButton ? (
                    <CVATTooltip overlay={`Press "${switchToolsBlockerShortcut}" to postpone running the algorithm `}>
                        <Button
                            type='link'
                            className={`cvat-annotation-header-block-tool-button cvat-annotation-header-button ${
                                toolsBlockerState.algorithmsLocked ? 'cvat-button-active' : ''
                            }`}
                            onClick={shouldEnableToolsBlockerOnClick ? onSwitchToolsBlockerState : undefined}
                        >
                            <StopOutlined />
                            Block
                        </Button>
                    </CVATTooltip>
                ) : null}
            </Col>
        </>
    );
}

export default React.memo(LeftGroup);
