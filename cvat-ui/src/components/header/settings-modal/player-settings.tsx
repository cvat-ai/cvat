// Copyright (C) 2020-2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';

import { Row, Col } from 'antd/lib/grid';
import Checkbox, { CheckboxChangeEvent } from 'antd/lib/checkbox';
import Button from 'antd/lib/button';
import Select from 'antd/lib/select';
import Popover from 'antd/lib/popover';
import InputNumber from 'antd/lib/input-number';
import Icon from '@ant-design/icons';
import Text from 'antd/lib/typography/Text';
import { CompactPicker } from 'react-color';

import { clamp } from 'utils/math';
import { BackJumpIcon, ForwardJumpIcon } from 'icons';
import { FrameSpeed } from 'reducers/interfaces';
import consts from 'consts';

interface Props {
    frameStep: number;
    frameSpeed: FrameSpeed;
    resetZoom: boolean;
    rotateAll: boolean;
    smoothImage: boolean;
    canvasBackgroundColor: string;
    onChangeFrameStep(step: number): void;
    onChangeFrameSpeed(speed: FrameSpeed): void;
    onSwitchResetZoom(enabled: boolean): void;
    onSwitchRotateAll(rotateAll: boolean): void;
    onChangeCanvasBackgroundColor(color: string): void;
    onSwitchSmoothImage(enabled: boolean): void;
}

export default function PlayerSettingsComponent(props: Props): JSX.Element {
    const {
        frameStep,
        frameSpeed,
        resetZoom,
        rotateAll,
        smoothImage,
        canvasBackgroundColor,
        onChangeFrameStep,
        onChangeFrameSpeed,
        onSwitchResetZoom,
        onSwitchRotateAll,
        onSwitchSmoothImage,
        onChangeCanvasBackgroundColor,
    } = props;

    const minFrameStep = 2;
    const maxFrameStep = 1000;

    return (
        <div className='cvat-player-settings'>
            <Row align='bottom' className='cvat-player-settings-step'>
                <Col>
                    <Text className='cvat-text-color'> Player step </Text>
                    <InputNumber
                        min={minFrameStep}
                        max={maxFrameStep}
                        value={frameStep}
                        onChange={(value: number | undefined | string | null): void => {
                            if (typeof value !== 'undefined' && value !== null) {
                                onChangeFrameStep(Math.floor(clamp(+value, minFrameStep, maxFrameStep)));
                            }
                        }}
                    />
                </Col>
                <Col offset={1}>
                    <Text type='secondary'>
                        Number of frames skipped when selecting
                        <Icon component={BackJumpIcon} />
                        or
                        <Icon component={ForwardJumpIcon} />
                    </Text>
                </Col>
            </Row>
            <Row align='middle' className='cvat-player-settings-speed'>
                <Col>
                    <Text className='cvat-text-color'> Player speed </Text>
                    <Select
                        className='cvat-player-settings-speed-select'
                        value={frameSpeed}
                        onChange={(speed: FrameSpeed): void => {
                            onChangeFrameSpeed(speed);
                        }}
                    >
                        <Select.Option
                            key='fastest'
                            value={FrameSpeed.Fastest}
                            className='cvat-player-settings-speed-fastest'
                        >
                            Fastest
                        </Select.Option>
                        <Select.Option key='fast' value={FrameSpeed.Fast} className='cvat-player-settings-speed-fast'>
                            Fast
                        </Select.Option>
                        <Select.Option
                            key='usual'
                            value={FrameSpeed.Usual}
                            className='cvat-player-settings-speed-usual'
                        >
                            Usual
                        </Select.Option>
                        <Select.Option key='slow' value={FrameSpeed.Slow} className='cvat-player-settings-speed-slow'>
                            Slow
                        </Select.Option>
                        <Select.Option
                            key='slower'
                            value={FrameSpeed.Slower}
                            className='cvat-player-settings-speed-slower'
                        >
                            Slower
                        </Select.Option>
                        <Select.Option
                            key='slowest'
                            value={FrameSpeed.Slowest}
                            className='cvat-player-settings-speed-slowest'
                        >
                            Slowest
                        </Select.Option>
                    </Select>
                </Col>
            </Row>
            <Row className='cvat-player-settings-canvas-background'>
                <Col>
                    <Popover
                        content={(
                            <CompactPicker
                                colors={consts.CANVAS_BACKGROUND_COLORS}
                                color={canvasBackgroundColor}
                                onChange={(e) => onChangeCanvasBackgroundColor(e.hex)}
                            />
                        )}
                        overlayClassName='canvas-background-color-picker-popover'
                        trigger='click'
                    >
                        <Button type='default'>Select canvas background color</Button>
                    </Popover>
                </Col>
            </Row>
            <Row justify='start'>
                <Col span={7}>
                    <Row className='cvat-player-settings-reset-zoom'>
                        <Col span={24} className='cvat-player-settings-reset-zoom-checkbox'>
                            <Checkbox
                                className='cvat-text-color'
                                checked={resetZoom}
                                onChange={(event: CheckboxChangeEvent): void => {
                                    onSwitchResetZoom(event.target.checked);
                                }}
                            >
                                Reset zoom
                            </Checkbox>
                        </Col>
                        <Col span={24}>
                            <Text type='secondary'> Fit image after changing frame </Text>
                        </Col>
                    </Row>
                </Col>
                <Col span={7} offset={5}>
                    <Row className='cvat-player-settings-rotate-all'>
                        <Col span={24} className='cvat-player-settings-rotate-all-checkbox'>
                            <Checkbox
                                className='cvat-text-color'
                                checked={rotateAll}
                                onChange={(event: CheckboxChangeEvent): void => {
                                    onSwitchRotateAll(event.target.checked);
                                }}
                            >
                                Rotate all images
                            </Checkbox>
                        </Col>
                        <Col span={24}>
                            <Text type='secondary'> Rotate all images simultaneously </Text>
                        </Col>
                    </Row>
                </Col>
            </Row>
            <Row justify='start'>
                <Col span={7}>
                    <Row className='cvat-player-settings-smooth-image'>
                        <Col span={24} className='cvat-player-settings-smooth-image-checkbox'>
                            <Checkbox
                                className='cvat-text-color'
                                checked={smoothImage}
                                onChange={(event: CheckboxChangeEvent): void => {
                                    onSwitchSmoothImage(event.target.checked);
                                }}
                            >
                                Smooth image
                            </Checkbox>
                        </Col>
                        <Col span={24}>
                            <Text type='secondary'> Smooth image when zoom-in it </Text>
                        </Col>
                    </Row>
                </Col>
            </Row>
        </div>
    );
}
