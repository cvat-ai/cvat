// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';

import {
    Row,
    Col,
    Icon,
    Slider,
    Tooltip,
    InputNumber,
} from 'antd';

import { SliderValue } from 'antd/lib/slider';
import Text from 'antd/lib/typography/Text';

interface Props {
    startFrame: number;
    stopFrame: number;
    frameNumber: number;
    inputFrameRef: React.RefObject<InputNumber>;
    onSliderChange(value: SliderValue): void;
    onInputChange(value: number | undefined): void;
    onURLIconClick(): void;
}

function PlayerNavigation(props: Props): JSX.Element {
    const {
        startFrame,
        stopFrame,
        frameNumber,
        inputFrameRef,
        onSliderChange,
        onInputChange,
        onURLIconClick,
    } = props;

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
                        <Tooltip title='filename.png'>
                            <Text type='secondary'>filename.png</Text>
                        </Tooltip>
                    </Col>
                    <Col offset={1}>
                        <Tooltip title='Create frame URL'>
                            <Icon className='cvat-player-frame-url-icon' type='link' onClick={onURLIconClick} />
                        </Tooltip>
                    </Col>
                </Row>
            </Col>
            <Col>
                <InputNumber
                    className='cvat-player-frame-selector'
                    type='number'
                    value={frameNumber || 0}
                    // https://stackoverflow.com/questions/38256332/in-react-whats-the-difference-between-onchange-and-oninput
                    onChange={onInputChange}
                    ref={inputFrameRef}
                />
            </Col>
        </>
    );
}

export default React.memo(PlayerNavigation);
