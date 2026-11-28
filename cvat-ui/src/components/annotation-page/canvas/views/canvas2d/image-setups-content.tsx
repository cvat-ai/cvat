// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useEffect, useState } from 'react';
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
    changeRelatedOverlayEnabled,
    changeRelatedOverlayOpacity,
    changeRelatedOverlayIndex,
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
        relatedOverlayEnabled,
        relatedOverlayOpacity,
        relatedOverlayIndex,
    } = useSelector((state: CombinedState): PlayerSettingsState => state.settings.player);
    const relatedFiles = useSelector((state: CombinedState): number => state.annotation.player.frame.relatedFiles);
    const jobInstance = useSelector((state: CombinedState) => state.annotation.job.instance);
    const frameNumber = useSelector((state: CombinedState): number => state.annotation.player.frame.number);
    const [relatedNames, setRelatedNames] = useState<string[]>([]);

    useEffect(() => {
        let cancelled = false;
        if (relatedFiles > 1 && jobInstance) {
            jobInstance.frames.contextImage(frameNumber).then((images: Record<string, ImageBitmap>) => {
                if (!cancelled) {
                    setRelatedNames(Object.keys(images).sort());
                }
            }).catch(() => {
                if (!cancelled) {
                    setRelatedNames([]);
                }
            });
        }
        return () => { cancelled = true; };
    }, [jobInstance, frameNumber, relatedFiles]);

    return (
        <div className='cvat-canvas-image-setups-content'>
            <Text>Image grid</Text>
            <hr />
            <Row justify='space-between' align='middle' gutter={8}>
                <Col span={1} />
                <Col span={6}>
                    <Text className='cvat-text-color'> Size </Text>
                </Col>
                <Col span={8}>
                    <Text className='cvat-text-color'> Color </Text>
                </Col>
                <Col span={8}>
                    <Text className='cvat-text-color'> Opacity </Text>
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
                            White
                        </Select.Option>
                        <Select.Option key='black' value={GridColor.Black}>
                            Black
                        </Select.Option>
                        <Select.Option key='red' value={GridColor.Red}>
                            Red
                        </Select.Option>
                        <Select.Option key='green' value={GridColor.Green}>
                            Green
                        </Select.Option>
                        <Select.Option key='blue' value={GridColor.Blue}>
                            Blue
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
            <Text>Color settings</Text>
            <hr />
            <Row justify='space-around'>
                <Col span={24}>
                    <Row className='cvat-image-setups-brightness'>
                        <Col span={6}>
                            <Text className='cvat-text-color'> Brightness </Text>
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
                            <Text className='cvat-text-color'> Contrast </Text>
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
                            <Text className='cvat-text-color'> Saturation </Text>
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
            { relatedFiles > 0 && (
                <>
                    <Text>Related image overlay</Text>
                    <hr />
                    <Row className='cvat-image-setups-related-overlay' align='middle' gutter={8}>
                        <Col span={2}>
                            <Checkbox
                                className='cvat-text-color cvat-image-setups-related-overlay-enabled'
                                checked={relatedOverlayEnabled}
                                onChange={(event: CheckboxChangeEvent): void => {
                                    dispatch(changeRelatedOverlayEnabled(event.target.checked));
                                }}
                            />
                        </Col>
                        <Col span={5}>
                            <Text className='cvat-text-color'> Opacity </Text>
                        </Col>
                        <Col span={17}>
                            <Slider
                                className='cvat-image-setups-related-overlay-opacity'
                                min={0}
                                max={100}
                                value={relatedOverlayOpacity}
                                disabled={!relatedOverlayEnabled}
                                onChange={(value: number | [number, number]): void => {
                                    dispatch(changeRelatedOverlayOpacity(value as number));
                                }}
                            />
                        </Col>
                    </Row>
                    { relatedFiles > 1 && (
                        <Row className='cvat-image-setups-related-overlay-selector' align='middle' gutter={8}>
                            <Col span={2} />
                            <Col span={5}>
                                <Text className='cvat-text-color'> Image </Text>
                            </Col>
                            <Col span={17}>
                                <Select
                                    className='cvat-image-setups-related-overlay-index'
                                    value={Math.min(relatedOverlayIndex, relatedFiles - 1)}
                                    disabled={!relatedOverlayEnabled}
                                    onChange={(value: number): void => {
                                        dispatch(changeRelatedOverlayIndex(value));
                                    }}
                                >
                                    {Array.from({ length: relatedFiles }, (_, idx) => (
                                        <Select.Option key={idx} value={idx}>
                                            {relatedNames[idx] ?? `Related image #${idx + 1}`}
                                        </Select.Option>
                                    ))}
                                </Select>
                            </Col>
                        </Row>
                    )}
                </>
            )}
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
                        Reset color settings
                    </Button>
                </Col>
            </Row>
        </div>
    );
}
