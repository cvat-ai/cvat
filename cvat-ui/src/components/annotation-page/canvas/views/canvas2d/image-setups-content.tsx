// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Row, Col } from 'antd/lib/grid';
import Checkbox, { CheckboxChangeEvent } from 'antd/lib/checkbox';
import Text from 'antd/lib/typography/Text';
import InputNumber from 'antd/lib/input-number';
import Select from 'antd/lib/select';
import Slider from 'antd/lib/slider';
import Button from 'antd/lib/button';

import {
    switchGrid,
    changeGridColor,
    changeGridOpacity,
    changeBrightnessLevel,
    changeContrastLevel,
    changeSaturationLevel,
    changeGridSize,
    resetImageFilters,
} from 'actions/settings-actions';
import { clamp } from 'utils/math';
import { GridColor, CombinedState, PlayerSettingsState } from 'reducers';
import GammaFilter from './gamma-filter';

const minGridSize = 5;
const maxGridSize = 1000;

export default function ImageSetupsContent(): JSX.Element {
    const dispatch = useDispatch();
    const {
        brightnessLevel,
        contrastLevel,
        saturationLevel,
        gridOpacity,
        gridColor,
        gridSize,
        grid: gridEnabled,
    } = useSelector((state: CombinedState): PlayerSettingsState => state.settings.player);

    return (
        <div className='cvat-canvas-image-setups-content'>
            <Text>图像网格</Text>
            <hr />
            <Row justify='space-between' align='middle' gutter={8}>
                <Col span={1} />
                <Col span={6}>
                    <Text className='cvat-text-color'> 大小 </Text>
                </Col>
                <Col span={8}>
                    <Text className='cvat-text-color'> 颜色 </Text>
                </Col>
                <Col span={8}>
                    <Text className='cvat-text-color'> 不透明度 </Text>
                </Col>
            </Row>
            <Row justify='space-between' align='middle' gutter={8}>
                <Col span={1}>
                    <Checkbox
                        className='cvat-text-color cvat-image-setups-grid'
                        checked={gridEnabled}
                        onChange={(event: CheckboxChangeEvent): void => {
                            dispatch(switchGrid(event.target.checked));
                        }}
                    />
                </Col>
                <Col span={6} className='cvat-image-setups-grid-size'>
                    <InputNumber
                        className='cvat-image-setups-grid-size-input'
                        min={minGridSize}
                        max={maxGridSize}
                        value={gridSize}
                        disabled={!gridEnabled}
                        onChange={(value: number | undefined | null | string): void => {
                            if (typeof value !== 'undefined' && value !== null) {
                                const converted = Math.floor(clamp(+value, minGridSize, maxGridSize));
                                dispatch(changeGridSize(converted));
                            }
                        }}
                    />
                </Col>
                <Col span={8} className='cvat-image-setups-grid-color'>
                    <Select
                        className='cvat-image-setups-grid-color-input'
                        value={gridColor}
                        disabled={!gridEnabled}
                        onChange={(color: GridColor): void => {
                            dispatch(changeGridColor(color));
                        }}
                    >
                        <Select.Option key='white' value={GridColor.White}>
                            白色
                        </Select.Option>
                        <Select.Option key='black' value={GridColor.Black}>
                            黑色
                        </Select.Option>
                        <Select.Option key='red' value={GridColor.Red}>
                            红色
                        </Select.Option>
                        <Select.Option key='green' value={GridColor.Green}>
                            绿色
                        </Select.Option>
                        <Select.Option key='blue' value={GridColor.Blue}>
                            蓝色
                        </Select.Option>
                    </Select>
                </Col>
                <Col span={8} className='cvat-image-setups-grid-opacity'>
                    <Slider
                        className='cvat-image-setups-grid-opacity-input'
                        min={0}
                        max={100}
                        value={gridOpacity}
                        disabled={!gridEnabled}
                        onChange={(value: number | [number, number]): void => {
                            dispatch(changeGridOpacity(value as number));
                        }}
                    />
                </Col>
            </Row>
            <Text>颜色设置</Text>
            <hr />
            <Row justify='space-around'>
                <Col span={24}>
                    <Row className='cvat-image-setups-brightness'>
                        <Col span={6}>
                            <Text className='cvat-text-color'> 亮度 </Text>
                        </Col>
                        <Col span={12}>
                            <Slider
                                min={50}
                                max={200}
                                value={brightnessLevel}
                                onChange={(value: number | [number, number]): void => {
                                    dispatch(changeBrightnessLevel(value as number));
                                }}
                            />
                        </Col>
                    </Row>
                    <Row className='cvat-image-setups-contrast'>
                        <Col span={6}>
                            <Text className='cvat-text-color'> 对比度 </Text>
                        </Col>
                        <Col span={12}>
                            <Slider
                                min={50}
                                max={200}
                                value={contrastLevel}
                                onChange={(value: number | [number, number]): void => {
                                    dispatch(changeContrastLevel(value as number));
                                }}
                            />
                        </Col>
                    </Row>
                    <Row className='cvat-image-setups-saturation'>
                        <Col span={6}>
                            <Text className='cvat-text-color'> 饱和度 </Text>
                        </Col>
                        <Col span={12}>
                            <Slider
                                min={0}
                                max={300}
                                value={saturationLevel}
                                onChange={(value: number | [number, number]): void => {
                                    dispatch(changeSaturationLevel(value as number));
                                }}
                            />
                        </Col>
                    </Row>
                </Col>
            </Row>
            <GammaFilter />
            <Row className='cvat-image-setups-reset-color-settings' justify='space-around'>
                <Col>
                    <Button
                        className='cvat-image-setups-reset-color-settings-button'
                        onClick={() => {
                            const defaultValue = 100;
                            dispatch(changeBrightnessLevel(defaultValue));
                            dispatch(changeContrastLevel(defaultValue));
                            dispatch(changeSaturationLevel(defaultValue));
                            dispatch(resetImageFilters());
                        }}
                    >
                        重置颜色设置
                    </Button>
                </Col>
            </Row>
        </div>
    );
}

