// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React, { useState, useEffect } from 'react';

import { Row, Col } from 'antd/lib/grid';
import Icon from 'antd/lib/icon';
import Slider, { SliderValue } from 'antd/lib/slider';
import Tooltip from 'antd/lib/tooltip';
import InputNumber from 'antd/lib/input-number';
import Text from 'antd/lib/typography/Text';

import { clamp } from 'utils/math';

interface Props {
    startFrame: number;
    stopFrame: number;
    frameNumber: number;
    frameFilename: string;
    focusFrameInputShortcut: string;
    inputFrameRef: React.RefObject<InputNumber>;
    onSliderChange(value: SliderValue): void;
    onInputChange(value: number): void;
    onURLIconClick(): void;
}

function PlayerNavigation(props: Props): JSX.Element {
    const {
        startFrame,
        stopFrame,
        frameNumber,
        frameFilename,
        focusFrameInputShortcut,
        inputFrameRef,
        onSliderChange,
        onInputChange,
        onURLIconClick,
    } = props;

    const [frameInputValue, setFrameInputValue] = useState<number>(frameNumber);

    useEffect(() => {
        if (frameNumber !== frameInputValue) {
            setFrameInputValue(frameNumber);
        }
    }, [frameNumber]);

    return (
        <>
            <Col className='cvat-player-controls'>
                <Row type='flex'>
                    <Col>
                        <Slider
                            className='cvat-player-slider'
                            min={startFrame}
                            max={stopFrame}
                            value={frameNumber || 0}
                            onChange={onSliderChange}
                        />
                    </Col>
                </Row>
                <Row type='flex' justify='center'>
                    <Col className='cvat-player-filename-wrapper'>
                        <Tooltip title={frameFilename} mouseLeaveDelay={0}>
                            <Text type='secondary'>{frameFilename}</Text>
                        </Tooltip>
                    </Col>
                    <Col offset={1}>
                        <Tooltip title='Create frame URL' mouseLeaveDelay={0}>
                            <Icon className='cvat-player-frame-url-icon' type='link' onClick={onURLIconClick} />
                        </Tooltip>
                    </Col>
                </Row>
            </Col>
            <Col>
                <Tooltip title={`Press ${focusFrameInputShortcut} to focus here`} mouseLeaveDelay={0}>
                    <InputNumber
                        className='cvat-player-frame-selector'
                        type='number'
                        value={frameInputValue}
                        onChange={(value: number | undefined) => {
                            if (typeof value === 'number') {
                                setFrameInputValue(Math.floor(clamp(value, startFrame, stopFrame)));
                            }
                        }}
                        onBlur={() => {
                            onInputChange(frameInputValue);
                        }}
                        onPressEnter={() => {
                            onInputChange(frameInputValue);
                        }}
                        ref={inputFrameRef}
                    />
                </Tooltip>
            </Col>
        </>
    );
}

export default React.memo(PlayerNavigation);
