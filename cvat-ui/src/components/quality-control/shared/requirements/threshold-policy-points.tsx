// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/* eslint jsx-a11y/label-has-associated-control: ["error", { "controlComponents": ["InputNumber"] }] */

import React, { useId } from 'react';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import Button from 'antd/lib/button';
import InputNumber from 'antd/lib/input-number';
import { MAX_THRESHOLD_POINTS } from 'cvat-core/src/quality/threshold-policy';
import { EditableThresholdPoint } from './threshold-policy-editor-types';

interface Props {
    points: EditableThresholdPoint[];
    selected: number | null;
    disabled: boolean;
    onSelect: (id: number) => void;
    onUpdate: (id: number, field: 'x' | 'y', value: number | null) => void;
    onDelete: (id: number) => void;
    onAdd: () => void;
}

export default function ThresholdPolicyPoints(props: Readonly<Props>): JSX.Element {
    const {
        points, selected, disabled, onSelect, onUpdate, onDelete, onAdd,
    } = props;
    const controlID = useId();
    return (
        <>
            <div className='cvat-threshold-policy-toolbar'>
                <strong>Key points ({points.length})</strong>
                <Button disabled={disabled || points.length >= MAX_THRESHOLD_POINTS}
                    icon={<PlusOutlined />} onClick={onAdd}>Add point</Button>
            </div>
            <div className='cvat-threshold-policy-points'>
                {points.map((point, index) => (
                    <div key={point.id}
                        className={`cvat-threshold-policy-row${selected === point.id ? ' selected' : ''}`}>
                        <strong>Point {index + 1}</strong>
                        <label htmlFor={`${controlID}-area-${point.id}`}>
                            GT area (px²)
                            <InputNumber id={`${controlID}-area-${point.id}`} value={point.x} min={0.000001}
                                disabled={disabled} onFocus={() => onSelect(point.id)}
                                onChange={(next) => onUpdate(point.id, 'x', next)} />
                        </label>
                        <label htmlFor={`${controlID}-iou-${point.id}`}>
                            IoU (%)
                            <InputNumber id={`${controlID}-iou-${point.id}`}
                                value={Number((point.y * 100).toPrecision(15))}
                                min={0} max={100} disabled={disabled}
                                onFocus={() => onSelect(point.id)}
                                onChange={(next) => onUpdate(point.id, 'y', next === null ? null : next / 100)} />
                        </label>
                        <Button icon={<DeleteOutlined />} aria-label={`Delete point ${index + 1}`}
                            disabled={disabled || points.length <= 2} onClick={() => onDelete(point.id)} />
                    </div>
                ))}
            </div>
            <p className='cvat-threshold-policy-hint'>
                Linear interpolation between points. Outside their range, the nearest endpoint is used.
            </p>
        </>
    );
}
