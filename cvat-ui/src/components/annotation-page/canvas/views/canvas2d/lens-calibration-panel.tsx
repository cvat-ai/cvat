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
}

type SliderKey = 'a' | 'b' | 'c' | 'HFOVInRadians' | 'cx' | 'cy';

const RANGES: Record<'a' | 'b' | 'c' | 'HFOVInRadians',
{ min: number; max: number; step: number }> = {
    a: { min: -1, max: 1, step: 0.001 },
    b: { min: -1, max: 1, step: 0.001 },
    c: { min: -1, max: 1, step: 0.001 },
    HFOVInRadians: { min: 0, max: 2 * Math.PI, step: 0.001 },
};

export default function LensCalibrationPanel(props: Props): JSX.Element {
    const {
        value, onChange, onSave, onCancel,
    } = props;

    const width = value.horizontalResolution;
    const height = value.aspectRatio > 0 ?
        Math.round(width / value.aspectRatio) :
        width;

    const set = (key: SliderKey, v: number): void => {
        onChange({ ...value, [key]: v });
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
            <Row justify='end' gutter={8} style={{ marginTop: 8 }}>
                <Col>
                    <Button onClick={onCancel}>Cancel</Button>
                </Col>
                <Col>
                    <Button type='primary' onClick={onSave}>Save</Button>
                </Col>
            </Row>
        </div>
    );
}
