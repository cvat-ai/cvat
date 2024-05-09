// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) 2023-2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, {
    useState, useEffect, useCallback, CSSProperties,
} from 'react';

import { Row, Col } from 'antd/lib/grid';
import Icon, { LinkOutlined, DeleteOutlined } from '@ant-design/icons';
import Slider from 'antd/lib/slider';
import InputNumber from 'antd/lib/input-number';
import Text from 'antd/lib/typography/Text';
import Modal from 'antd/lib/modal';

import { RestoreIcon } from 'icons';
import CVATTooltip from 'components/common/cvat-tooltip';
import { clamp } from 'utils/math';
import GlobalHotKeys, { KeyMap } from 'utils/mousetrap-react';
import { Workspace } from 'reducers';

interface Props {
    startFrame: number;
    stopFrame: number;
    playing: boolean;
    ranges: string;
    frameNumber: number;
    frameFilename: string;
    frameDeleted: boolean;
    deleteFrameAvailable: boolean;
    deleteFrameShortcut: string;
    focusFrameInputShortcut: string;
    inputFrameRef: React.RefObject<HTMLInputElement>;
    keyMap: KeyMap;
    workspace: Workspace;
    onSliderChange(value: number): void;
    onInputChange(value: number): void;
    onURLIconClick(): void;
    onDeleteFrame(): void;
    onRestoreFrame(): void;
    switchNavigationBlocked(blocked: boolean): void;
}

function PlayerNavigation(props: Props): JSX.Element {
    const {
        startFrame,
        stopFrame,
        playing,
        frameNumber,
        frameFilename,
        frameDeleted,
        deleteFrameShortcut,
        focusFrameInputShortcut,
        inputFrameRef,
        ranges,
        keyMap,
        workspace,
        deleteFrameAvailable,
        onSliderChange,
        onInputChange,
        onURLIconClick,
        onDeleteFrame,
        onRestoreFrame,
        switchNavigationBlocked,
    } = props;

    const [frameInputValue, setFrameInputValue] = useState<number>(frameNumber);

    useEffect(() => {
        if (frameNumber !== frameInputValue) {
            setFrameInputValue(frameNumber);
        }
    }, [frameNumber]);

    const showDeleteFrameDialog = useCallback(() => {
        if (!playing) {
            switchNavigationBlocked(true);
            Modal.confirm({
                title: `Do you want to delete frame #${frameNumber}?`,
                content: 'The frame will not be visible in navigation and exported datasets, but it still can be restored with all the annotations.',
                className: 'cvat-modal-delete-frame',
                okText: 'Delete',
                okType: 'danger',
                onOk: () => {
                    switchNavigationBlocked(false);
                    onDeleteFrame();
                },
                afterClose: () => {
                    switchNavigationBlocked(false);
                },
            });
        }
    }, [playing, frameNumber]);

    const subKeyMap = {
        DELETE_FRAME: keyMap.DELETE_FRAME,
        FOCUS_INPUT_FRAME: keyMap.FOCUS_INPUT_FRAME,
    };

    const handlers = {
        DELETE_FRAME: (event: KeyboardEvent | undefined) => {
            event?.preventDefault();
            onDeleteFrame();
        },
        FOCUS_INPUT_FRAME: (event: KeyboardEvent | undefined) => {
            event?.preventDefault();
            if (inputFrameRef.current) {
                inputFrameRef.current.focus();
            }
        },
    };

    const deleteFrameIconStyle: CSSProperties = workspace === Workspace.SINGLE_SHAPE ? {
        pointerEvents: 'none',
        opacity: 0.5,
    } : {};

    const deleteFrameIcon = !frameDeleted ? (
        <CVATTooltip title={`Delete the frame ${deleteFrameShortcut}`}>
            <DeleteOutlined
                style={deleteFrameIconStyle}
                className='cvat-player-delete-frame'
                onClick={showDeleteFrameDialog}
            />
        </CVATTooltip>
    ) : (
        <CVATTooltip title='Restore the frame'>
            <Icon
                style={deleteFrameIconStyle}
                className='cvat-player-restore-frame'
                onClick={onRestoreFrame}
                component={RestoreIcon}
            />
        </CVATTooltip>
    );

    return (
        <>
            { workspace !== Workspace.SINGLE_SHAPE && <GlobalHotKeys keyMap={subKeyMap} handlers={handlers} />}
            <Col className='cvat-player-controls'>
                <Row align='bottom'>
                    <Col>
                        <Slider
                            className='cvat-player-slider'
                            min={startFrame}
                            max={stopFrame}
                            value={frameNumber || 0}
                            onChange={workspace !== Workspace.SINGLE_SHAPE ? onSliderChange : undefined}
                        />
                        {!!ranges && (
                            <svg className='cvat-player-slider-progress' viewBox='0 0 1000 16' xmlns='http://www.w3.org/2000/svg'>
                                {ranges.split(';').map((range) => {
                                    const [start, end] = range.split(':').map((num) => +num);
                                    const adjustedStart = Math.max(0, start - 1);
                                    let totalSegments = stopFrame - startFrame;
                                    if (totalSegments === 0) {
                                        // corner case for jobs with one image
                                        totalSegments = 1;
                                    }
                                    const segmentWidth = 1000 / totalSegments;
                                    const width = Math.max((end - adjustedStart), 1) * segmentWidth;
                                    const offset = (Math.max((adjustedStart - startFrame), 0) / totalSegments) * 1000;
                                    return (<rect rx={10} key={start} x={offset} y={0} height={16} width={width} />);
                                })}
                            </svg>
                        )}
                    </Col>
                </Row>
                <Row justify='center'>
                    <Col className='cvat-player-filename-wrapper'>
                        <CVATTooltip title={`${frameFilename}`}>
                            <Text type='secondary'>{frameFilename}</Text>
                        </CVATTooltip>
                    </Col>
                    <Col offset={1}>
                        <CVATTooltip title='Create frame URL'>
                            <LinkOutlined className='cvat-player-frame-url-icon' onClick={onURLIconClick} />
                        </CVATTooltip>
                        {
                            deleteFrameAvailable && deleteFrameIcon
                        }
                    </Col>
                </Row>
            </Col>
            <Col>
                <CVATTooltip title={`Press ${focusFrameInputShortcut} to focus here`}>
                    <InputNumber
                        ref={inputFrameRef}
                        className='cvat-player-frame-selector'
                        type='number'
                        disabled={workspace === Workspace.SINGLE_SHAPE}
                        value={frameInputValue}
                        onChange={(value: number | undefined | string | null) => {
                            if (typeof value !== 'undefined' && value !== null) {
                                setFrameInputValue(Math.floor(clamp(+value, startFrame, stopFrame)));
                            }
                        }}
                        onFocus={() => inputFrameRef.current?.select()}
                        onBlur={() => {
                            onInputChange(frameInputValue);
                        }}
                        onPressEnter={() => {
                            onInputChange(frameInputValue);
                        }}
                    />
                </CVATTooltip>
            </Col>
        </>
    );
}

export default React.memo(PlayerNavigation);
