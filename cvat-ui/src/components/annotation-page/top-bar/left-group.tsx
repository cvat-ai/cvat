// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { Col } from 'antd/lib/grid';
import Icon, { StopOutlined, CheckCircleOutlined, LoadingOutlined } from '@ant-design/icons';
import Modal from 'antd/lib/modal';
import Button from 'antd/lib/button';
import Text from 'antd/lib/typography/Text';

import { UndoIcon, RedoIcon } from 'icons';
import { ActiveControl, ToolsBlockerState } from 'reducers';
import { registerComponentShortcuts } from 'actions/shortcuts-actions';
import AnnotationMenuComponent from 'components/annotation-page/top-bar/annotation-menu';
import CVATTooltip from 'components/common/cvat-tooltip';
import { ShortcutScope } from 'utils/enums';
import { subKeyMap } from 'utils/component-subkeymap';
import GlobalHotKeys, { KeyMap } from 'utils/mousetrap-react';
import { finishDrawAvailable } from 'utils/drawing';
import SaveAnnotationsButton from './save-annotations-button';

interface Props {
    saving: boolean;
    undoAction?: string;
    redoAction?: string;
    undoShortcut: string;
    redoShortcut: string;
    drawShortcut: string;
    switchToolsBlockerShortcut: string;
    toolsBlockerState: ToolsBlockerState;
    activeControl: ActiveControl;
    keyMap: KeyMap;
    onUndoClick(): void;
    onRedoClick(): void;
    onFinishDraw(): void;
    onSwitchToolsBlockerState(): void;
}

const componentShortcuts = {
    UNDO: {
        name: '撤销操作',
        description: '取消与对象相关的最新操作',
        sequences: ['ctrl+z'],
        scope: ShortcutScope.ANNOTATION_PAGE,
    },
    REDO: {
        name: '重做操作',
        description: '取消撤销操作',
        sequences: ['ctrl+shift+z', 'ctrl+y'],
        scope: ShortcutScope.ANNOTATION_PAGE,
    },
    SWITCH_TOOLS_BLOCKER_STATE: {
        name: '切换算法阻塞',
        description: '推迟运行交互工具的算法',
        sequences: ['tab'],
        scope: ShortcutScope.STANDARD_WORKSPACE,
    },
};

registerComponentShortcuts(componentShortcuts);

function LeftGroup(props: Props): JSX.Element {
    const {
        saving,
        keyMap,
        undoAction,
        redoAction,
        undoShortcut,
        redoShortcut,
        drawShortcut,
        switchToolsBlockerShortcut,
        activeControl,
        toolsBlockerState,
        onUndoClick,
        onRedoClick,
        onFinishDraw,
        onSwitchToolsBlockerState,
    } = props;

    const includesDoneButton = finishDrawAvailable(activeControl);

    const includesToolsBlockerButton =
        [ActiveControl.OPENCV_TOOLS, ActiveControl.AI_TOOLS].includes(activeControl) && toolsBlockerState.buttonVisible;

    const handlers: Record<keyof typeof componentShortcuts, (event?: KeyboardEvent) => void> = {
        UNDO: (event: KeyboardEvent | undefined) => {
            event?.preventDefault();
            if (undoAction) {
                onUndoClick();
            }
        },
        REDO: (event: KeyboardEvent | undefined) => {
            event?.preventDefault();
            if (redoAction) {
                onRedoClick();
            }
        },
        SWITCH_TOOLS_BLOCKER_STATE: (event: KeyboardEvent | undefined) => {
            event?.preventDefault();
            onSwitchToolsBlockerState();
        },
    };

    return (
        <>
            <GlobalHotKeys keyMap={subKeyMap(componentShortcuts, keyMap)} handlers={handlers} />
            { saving && (
                <Modal
                    open
                    destroyOnClose
                    className='cvat-saving-job-modal'
                    closable={false}
                    footer={[]}
                >
                    <Text>CVAT 正在保存您的标注，请稍候</Text>
                    <LoadingOutlined />
                </Modal>
            )}
            <Col className='cvat-annotation-header-left-group'>
                <AnnotationMenuComponent />
                <SaveAnnotationsButton />
                <CVATTooltip overlay={`撤销：${undoAction} ${undoShortcut}`}>
                    <Button
                        style={{ pointerEvents: undoAction ? 'initial' : 'none', opacity: undoAction ? 1 : 0.5 }}
                        type='link'
                        className='cvat-annotation-header-undo-button cvat-annotation-header-button'
                        onClick={onUndoClick}
                    >
                        <Icon component={UndoIcon} />
                        <span>撤销</span>
                    </Button>
                </CVATTooltip>
                <CVATTooltip overlay={`重做：${redoAction} ${redoShortcut}`}>
                    <Button
                        style={{ pointerEvents: redoAction ? 'initial' : 'none', opacity: redoAction ? 1 : 0.5 }}
                        type='link'
                        className='cvat-annotation-header-redo-button cvat-annotation-header-button'
                        onClick={onRedoClick}
                    >
                        <Icon component={RedoIcon} />
                        重做
                    </Button>
                </CVATTooltip>
                {includesDoneButton ? (
                    <CVATTooltip overlay={`按 "${drawShortcut}" 完成`}>
                        <Button type='link' className='cvat-annotation-header-done-button cvat-annotation-header-button' onClick={onFinishDraw}>
                            <CheckCircleOutlined />
                            完成
                        </Button>
                    </CVATTooltip>
                ) : null}
                {includesToolsBlockerButton ? (
                    <CVATTooltip overlay={`按 "${switchToolsBlockerShortcut}" 推迟运行算法`}>
                        <Button
                            type='link'
                            className={`cvat-annotation-header-block-tool-button cvat-annotation-header-button ${
                                toolsBlockerState.algorithmsLocked ? 'cvat-button-active' : ''
                            }`}
                            onClick={onSwitchToolsBlockerState}
                        >
                            <StopOutlined />
                            阻塞
                        </Button>
                    </CVATTooltip>
                ) : null}
            </Col>
        </>
    );
}

export default React.memo(LeftGroup);


