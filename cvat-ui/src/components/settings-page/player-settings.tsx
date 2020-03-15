// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';

import {
    Row,
    Col,
    Checkbox,
    Slider,
    Select,
    InputNumber,
    Icon,
} from 'antd';

import Text from 'antd/lib/typography/Text';
import { CheckboxChangeEvent } from 'antd/lib/checkbox';

import {
    BackJumpIcon,
    ForwardJumpIcon,
} from 'icons';

import {
    FrameSpeed,
    GridColor,
} from 'reducers/interfaces';

interface Props {
    frameStep: number;
    frameSpeed: FrameSpeed;
    resetZoom: boolean;
    rotateAll: boolean;
    grid: boolean;
    gridSize: number;
    gridColor: GridColor;
    gridOpacity: number;
    brightnessLevel: number;
    contrastLevel: number;
    saturationLevel: number;
    onChangeFrameStep(step: number): void;
    onChangeFrameSpeed(speed: FrameSpeed): void;
    onSwitchResetZoom(enabled: boolean): void;
    onSwitchRotateAll(rotateAll: boolean): void;
    onSwitchGrid(grid: boolean): void;
    onChangeGridSize(gridSize: number): void;
    onChangeGridColor(gridColor: GridColor): void;
    onChangeGridOpacity(gridOpacity: number): void;
    onChangeBrightnessLevel(level: number): void;
    onChangeContrastLevel(level: number): void;
    onChangeSaturationLevel(level: number): void;
}

export default function PlayerSettingsComponent(props: Props): JSX.Element {
    const {
        frameStep,
        frameSpeed,
        resetZoom,
        rotateAll,
        grid,
        gridSize,
        gridColor,
        gridOpacity,
        brightnessLevel,
        contrastLevel,
        saturationLevel,
        onChangeFrameStep,
        onChangeFrameSpeed,
        onSwitchResetZoom,
        onSwitchRotateAll,
        onSwitchGrid,
        onChangeGridSize,
        onChangeGridColor,
        onChangeGridOpacity,
        onChangeBrightnessLevel,
        onChangeContrastLevel,
        onChangeSaturationLevel,
    } = props;

    return (
        <div className='cvat-player-settings'>
            <Row type='flex' align='bottom' className='cvat-player-settings-step'>
                <Col>
                    <Text className='cvat-text-color'> Player step </Text>
                    <InputNumber
                        min={2}
                        max={1000}
                        value={frameStep}
                        onChange={(value: number | undefined): void => {
                            if (value) {
                                onChangeFrameStep(value);
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
            <Row type='flex' align='middle' className='cvat-player-settings-speed'>
                <Col>
                    <Text className='cvat-text-color'> Player speed </Text>
                    <Select
                        value={frameSpeed}
                        onChange={(speed: FrameSpeed): void => {
                            onChangeFrameSpeed(speed);
                        }}
                    >
                        <Select.Option key='fastest' value={FrameSpeed.Fastest}>Fastest</Select.Option>
                        <Select.Option key='fast' value={FrameSpeed.Fast}>Fast</Select.Option>
                        <Select.Option key='usual' value={FrameSpeed.Usual}>Usual</Select.Option>
                        <Select.Option key='slow' value={FrameSpeed.Slow}>Slow</Select.Option>
                        <Select.Option key='slower' value={FrameSpeed.Slower}>Slower</Select.Option>
                        <Select.Option key='slowest' value={FrameSpeed.Slowest}>Slowest</Select.Option>
                    </Select>
                </Col>
            </Row>
            <Row type='flex'>
                <Col>
                    <Checkbox
                        className='cvat-text-color cvat-player-settings-grid'
                        checked={grid}
                        onChange={(event: CheckboxChangeEvent): void => {
                            onSwitchGrid(event.target.checked);
                        }}
                    >
                        Show grid
                    </Checkbox>
                </Col>
            </Row>
            <Row type='flex' justify='space-between'>
                <Col span={8} className='cvat-player-settings-grid-size'>
                    <Text className='cvat-text-color'> Grid size </Text>
                    <InputNumber
                        min={5}
                        max={1000}
                        step={1}
                        value={gridSize}
                        disabled={!grid}
                        onChange={(value: number | undefined): void => {
                            if (value) {
                                onChangeGridSize(value);
                            }
                        }}
                    />
                </Col>
                <Col span={8} className='cvat-player-settings-grid-color'>
                    <Text className='cvat-text-color'> Grid color </Text>
                    <Select
                        value={gridColor}
                        disabled={!grid}
                        onChange={(color: GridColor): void => {
                            onChangeGridColor(color);
                        }}
                    >
                        <Select.Option key='white' value={GridColor.White}>White</Select.Option>
                        <Select.Option key='black' value={GridColor.Black}>Black</Select.Option>
                        <Select.Option key='red' value={GridColor.Red}>Red</Select.Option>
                        <Select.Option key='green' value={GridColor.Green}>Green</Select.Option>
                        <Select.Option key='blue' value={GridColor.Blue}>Blue</Select.Option>
                    </Select>
                </Col>
                <Col span={8} className='cvat-player-settings-grid-opacity'>
                    <Text className='cvat-text-color'> Grid opacity </Text>
                    <Slider
                        min={0}
                        max={100}
                        value={gridOpacity}
                        disabled={!grid}
                        onChange={(value: number | [number, number]): void => {
                            onChangeGridOpacity(value as number);
                        }}
                    />
                    <Text className='cvat-text-color'>{`${gridOpacity} %`}</Text>
                </Col>
            </Row>
            <Row type='flex' justify='start'>
                <Col>
                    <Row className='cvat-player-settings-reset-zoom'>
                        <Col className='cvat-player-settings-reset-zoom-checkbox'>
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
                        <Col>
                            <Text type='secondary'> Fit image after changing frame </Text>
                        </Col>
                    </Row>
                </Col>
                <Col offset={5}>
                    <Row className='cvat-player-settings-rotate-all'>
                        <Col className='cvat-player-settings-rotate-all-checkbox'>
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
                        <Col>
                            <Text type='secondary'> Rotate all images simultaneously </Text>
                        </Col>
                    </Row>
                </Col>
            </Row>
            <Row className='cvat-player-settings-brightness'>
                <Col className='cvat-text-color'>
                    Brightness
                </Col>
                <Col>
                    <Slider
                        min={50}
                        max={200}
                        value={brightnessLevel}
                        onChange={(value: number | [number, number]): void => {
                            onChangeBrightnessLevel(value as number);
                        }}
                    />
                </Col>
            </Row>
            <Row className='cvat-player-settings-contrast'>
                <Col className='cvat-text-color'>
                    Contrast
                </Col>
                <Col>
                    <Slider
                        min={50}
                        max={200}
                        value={contrastLevel}
                        onChange={(value: number | [number, number]): void => {
                            onChangeContrastLevel(value as number);
                        }}
                    />
                </Col>
            </Row>
            <Row className='cvat-player-settings-saturation'>
                <Col className='cvat-text-color'>
                    Saturation
                </Col>
                <Col>
                    <Slider
                        min={0}
                        max={300}
                        value={saturationLevel}
                        onChange={(value: number | [number, number]): void => {
                            onChangeSaturationLevel(value as number);
                        }}
                    />
                </Col>
            </Row>
        </div>
    );
}
