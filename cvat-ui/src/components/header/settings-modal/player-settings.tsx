// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) 2023 CVAT.ai Corporation
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
import { FrameSpeed } from 'reducers';
import config from 'config';
import { usePlugins } from 'utils/hooks';

interface Props {
    frameStep: number;
    frameSpeed: FrameSpeed;
    resetZoom: boolean;
    rotateAll: boolean;
    smoothImage: boolean;
    showDeletedFrames: boolean;
    canvasBackgroundColor: string;
    onChangeFrameStep(step: number): void;
    onChangeFrameSpeed(speed: FrameSpeed): void;
    onSwitchResetZoom(enabled: boolean): void;
    onSwitchRotateAll(rotateAll: boolean): void;
    onChangeCanvasBackgroundColor(color: string): void;
    onSwitchSmoothImage(enabled: boolean): void;
    onSwitchShowingDeletedFrames(enabled: boolean): void;
}

export default function PlayerSettingsComponent(props: Props): JSX.Element {
    const {
        frameStep,
        frameSpeed,
        resetZoom,
        rotateAll,
        smoothImage,
        showDeletedFrames,
        canvasBackgroundColor,
        onChangeFrameStep,
        onChangeFrameSpeed,
        onSwitchResetZoom,
        onSwitchRotateAll,
        onSwitchSmoothImage,
        onChangeCanvasBackgroundColor,
        onSwitchShowingDeletedFrames,
    } = props;

    const plugins = usePlugins((state) => state.plugins.components.settings.player, props);

    const minFrameStep = 2;
    const maxFrameStep = 1000;

    const items: [JSX.Element, number][] = [];
    items.push([(
        <Row key='player-step' align='bottom' className='cvat-player-settings-step cvat-player-setting'>
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
    ), 0]);

    items.push([(
        <Row key='player-speed' align='middle' className='cvat-player-settings-speed cvat-player-setting'>
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
    ), 10]);

    items.push([(
        <Row key='canvas-background' className='cvat-player-settings-canvas-background cvat-player-setting'>
            <Col>
                <Popover
                    content={(
                        <CompactPicker
                            colors={config.CANVAS_BACKGROUND_COLORS}
                            color={canvasBackgroundColor}
                            onChange={(e) => onChangeCanvasBackgroundColor(e.hex)}
                        />
                    )}
                    overlayClassName='canvas-background-color-picker-popover'
                    trigger='click'
                >
                    <Button
                        className='cvat-select-canvas-background-color-button'
                        type='default'
                    >
                        Select canvas background color
                    </Button>
                </Popover>
            </Col>
        </Row>
    ), 20]);

    items.push([(
        <Row key='reset-zoom' className='cvat-player-setting' justify='start'>
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
    ), 30]);

    items.push([(
        <Row key='smooth-image' className='cvat-player-setting' justify='start'>
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
            <Col span={7} offset={5} className='cvat-workspace-settings-show-deleted'>
                <Row>
                    <Checkbox
                        className='cvat-text-color'
                        checked={showDeletedFrames}
                        onChange={(event: CheckboxChangeEvent): void => {
                            onSwitchShowingDeletedFrames(event.target.checked);
                        }}
                    >
                        Show deleted frames
                    </Checkbox>
                </Row>
                <Row>
                    <Text type='secondary'>You will be able to navigate and restore deleted frames</Text>
                </Row>
            </Col>
        </Row>
    ), 40]);

    items.push(...plugins.map(({ component: Component, weight }, index: number) => (
        [<Component key={index} targetProps={props} />, weight] as [JSX.Element, number]
    )));

    return (
        <div className='cvat-player-settings'>
            { items.sort((item1, item2) => item1[1] - item2[1])
                .map((item) => item[0]) }
        </div>
    );
}
