// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { Row, Col } from 'antd/lib/grid';
import Slider from 'antd/lib/slider';
import InputNumber from 'antd/lib/input-number';
import Button from 'antd/lib/button';
import Text from 'antd/lib/typography/Text';

export interface LensDraft {
    a: number;
    b: number;
    c: number;
    HFOVInRadians: number;
    cx?: number;
    cy?: number;
    horizontalResolution: number;
    aspectRatio: number;
    lensType: 'Equidistant';
}

interface Props {
    value: LensDraft;
    onChange: (next: LensDraft) => void;
    onSave: () => void;
    onCancel: () => void;
    onTurnOff: () => void;
}

type SliderKey = 'a' | 'b' | 'c' | 'HFOVInRadians' | 'cx' | 'cy';

const RANGES: Record<'a' | 'b' | 'c' | 'HFOVInRadians',
{ min: number; max: number; step: number }> = {
    a: { min: -1, max: 1, step: 0.001 },
    b: { min: -1, max: 1, step: 0.001 },
    c: { min: -1, max: 1, step: 0.001 },
    HFOVInRadians: { min: 0, max: 2 * Math.PI, step: 0.001 },
};

// Width/height boxes are clamped to a sane range so the user cannot type
// nonsensical resolutions (zero or negative break the lens model; absurdly
// large values would make cx/cy sliders useless).
const RES_MIN = 1;
const RES_MAX = 16384;

export default function LensCalibrationPanel(props: Props): JSX.Element {
    const {
        value, onChange, onSave, onCancel, onTurnOff,
    } = props;

    const width = value.horizontalResolution;
    const height = value.aspectRatio > 0 ?
        Math.round(width / value.aspectRatio) :
        width;
    const aspectRatioDisplay = value.aspectRatio > 0 ?
        Number(value.aspectRatio.toFixed(4)) :
        0;

    const set = (key: SliderKey, v: number): void => {
        onChange({ ...value, [key]: v });
    };

    const setWidth = (newWidth: number): void => {
        if (!Number.isFinite(newWidth) || newWidth <= 0) return;
        const clampedWidth = Math.max(RES_MIN, Math.min(RES_MAX, Math.round(newWidth)));
        // Preserve current height by recomputing aspectRatio = width / height.
        const newAspectRatio = height > 0 ? clampedWidth / height : value.aspectRatio;
        onChange({
            ...value,
            horizontalResolution: clampedWidth,
            aspectRatio: newAspectRatio,
        });
    };

    const setHeight = (newHeight: number): void => {
        if (!Number.isFinite(newHeight) || newHeight <= 0) return;
        const clampedHeight = Math.max(RES_MIN, Math.min(RES_MAX, Math.round(newHeight)));
        // Width is unchanged; aspectRatio = width / height.
        const newAspectRatio = width / clampedHeight;
        onChange({
            ...value,
            aspectRatio: newAspectRatio,
        });
    };

    const sliderRow = (
        label: string,
        key: SliderKey,
        min: number,
        max: number,
        step: number,
        fallback = 0,
    ): JSX.Element => {
        const current = typeof value[key] === 'number' ?
            (value[key] as number) :
            fallback;
        return (
            <Row align='middle' gutter={8} style={{ marginBottom: 6 }} key={key}>
                <Col span={5}>
                    <Text className='cvat-text-color'>{label}</Text>
                </Col>
                <Col span={12}>
                    <Slider
                        min={min}
                        max={max}
                        step={step}
                        value={current}
                        onChange={(v: number | [number, number]): void => {
                            set(key, v as number);
                        }}
                    />
                </Col>
                <Col span={7}>
                    <InputNumber
                        size='small'
                        min={min}
                        max={max}
                        step={step}
                        value={current}
                        onChange={(v: number | string | null | undefined): void => {
                            if (typeof v === 'number' && Number.isFinite(v)) {
                                set(key, v);
                            }
                        }}
                    />
                </Col>
            </Row>
        );
    };

    const cxDefault = Math.round(width / 2);
    const cyDefault = Math.round(height / 2);

    return (
        <div className='cvat-lens-calibration-panel'>
            <Text strong>Lens calibration</Text>
            <hr />
            {sliderRow('a', 'a', RANGES.a.min, RANGES.a.max, RANGES.a.step)}
            {sliderRow('b', 'b', RANGES.b.min, RANGES.b.max, RANGES.b.step)}
            {sliderRow('c', 'c', RANGES.c.min, RANGES.c.max, RANGES.c.step)}
            {sliderRow(
                'HFOV (rad)', 'HFOVInRadians', RANGES.HFOVInRadians.min, RANGES.HFOVInRadians.max, RANGES.HFOVInRadians.step,
            )}
            {sliderRow('cx', 'cx', 0, width, 1, cxDefault)}
            {sliderRow('cy', 'cy', 0, height, 1, cyDefault)}

            <Row align='middle' gutter={8} style={{ marginBottom: 6 }}>
                <Col span={8}>
                    <Text className='cvat-text-color'>Video width (px)</Text>
                </Col>
                <Col span={16}>
                    <InputNumber
                        size='small'
                        min={RES_MIN}
                        max={RES_MAX}
                        step={1}
                        value={width}
                        style={{ width: '100%' }}
                        onChange={(v: number | string | null | undefined): void => {
                            if (typeof v === 'number') setWidth(v);
                        }}
                    />
                </Col>
            </Row>
            <Row align='middle' gutter={8} style={{ marginBottom: 6 }}>
                <Col span={8}>
                    <Text className='cvat-text-color'>Video height (px)</Text>
                </Col>
                <Col span={16}>
                    <InputNumber
                        size='small'
                        min={RES_MIN}
                        max={RES_MAX}
                        step={1}
                        value={height}
                        style={{ width: '100%' }}
                        onChange={(v: number | string | null | undefined): void => {
                            if (typeof v === 'number') setHeight(v);
                        }}
                    />
                </Col>
            </Row>
            <Row align='middle' gutter={8} style={{ marginBottom: 6 }}>
                <Col span={8}>
                    <Text className='cvat-text-color'>Aspect ratio</Text>
                </Col>
                <Col span={16}>
                    <InputNumber
                        size='small'
                        value={aspectRatioDisplay}
                        disabled
                        style={{ width: '100%' }}
                    />
                </Col>
            </Row>

            <Row justify='end' gutter={8} style={{ marginTop: 8 }}>
                <Col>
                    <Button onClick={onCancel}>Cancel</Button>
                </Col>
                <Col>
                    <Button danger type='primary' onClick={onTurnOff}>Turn Off</Button>
                </Col>
                <Col>
                    <Button type='primary' onClick={onSave}>Save</Button>
                </Col>
            </Row>
        </div>
    );
}
