import React from 'react';

import {
    Row,
    Col,
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
    onSliderChange(value: SliderValue): void;
    onInputChange(value: number | undefined): void;
}

function PlayerNavigation(props: Props): JSX.Element {
    const {
        startFrame,
        stopFrame,
        frameNumber,
        onSliderChange,
        onInputChange,
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
                <Row type='flex' justify='space-around'>
                    <Col className='cvat-player-filename-wrapper'>
                        <Tooltip title='filename.png'>
                            <Text type='secondary'>filename.png</Text>
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
                />
            </Col>
        </>
    );
}

export default React.memo(PlayerNavigation);
