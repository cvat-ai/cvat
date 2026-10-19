// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/* eslint jsx-a11y/label-has-associated-control: ["error", { "controlComponents": ["Select", "InputNumber"] }] */

import React, {
    useCallback, useEffect, useId, useRef, useState,
} from 'react';
import { UndoOutlined } from '@ant-design/icons';
import Alert from 'antd/lib/alert';
import Button from 'antd/lib/button';
import InputNumber from 'antd/lib/input-number';
import Select from 'antd/lib/select';
import { SimilarityThresholdPolicy } from 'cvat-core/src/quality/server-response-types';
import { evaluateThresholdPolicy, validateThresholdPolicy } from 'cvat-core/src/quality/threshold-policy';
import ThresholdPolicyChart from './threshold-policy-chart';
import ThresholdPolicyPoints from './threshold-policy-points';
import {
    EditableThresholdPolicy, EditableLinearThresholdPolicy, ThresholdCoordinates,
} from './threshold-policy-editor-types';

interface Props {
    value?: SimilarityThresholdPolicy;
    onChange?: (value: SimilarityThresholdPolicy) => void;
    onValidityChange?: (valid: boolean) => void;
    disabled?: boolean;
}

const DEFAULT_POLICY: Extract<SimilarityThresholdPolicy, { mode: 'constant' }> = {
    type: 'iou', mode: 'constant', value: 0.4,
};

const toPolicy = (policy: EditableThresholdPolicy): SimilarityThresholdPolicy => (
    policy.mode === 'constant' ? { ...policy } : {
        ...policy, points: policy.points.map(({ x, y }) => ({ x, y })),
    }
);

const equal = (a: SimilarityThresholdPolicy, b: SimilarityThresholdPolicy): boolean => {
    if (a.mode === 'constant') return b.mode === 'constant' && a.value === b.value;
    return b.mode === 'linear' && a.points.length === b.points.length &&
        a.points.every((point, index) => point.x === b.points[index].x && point.y === b.points[index].y);
};

const makeDrafts = (policy: EditableThresholdPolicy): {
    constant: typeof DEFAULT_POLICY;
    linear: EditableLinearThresholdPolicy | null;
} => ({
    constant: policy.mode === 'constant' ? policy : DEFAULT_POLICY,
    linear: policy.mode === 'linear' ? policy : null,
});

export default function ThresholdPolicyEditor(props: Readonly<Props>): JSX.Element {
    const {
        value = DEFAULT_POLICY, onChange, onValidityChange, disabled = false,
    } = props;
    const controlID = useId();
    const nextID = useRef(0);
    const load = useCallback((source: SimilarityThresholdPolicy): EditableThresholdPolicy => (
        source.mode === 'constant' ? { ...source } : {
            ...source, points: source.points.map((point) => ({ ...point, id: nextID.current++ })),
        }
    ), []);
    const [policy, setPolicy] = useState(() => load(value));
    const published = useRef(value);
    const drafts = useRef(makeDrafts(policy));
    const dragStart = useRef<EditableThresholdPolicy | null>(null);
    const [history, setHistory] = useState<EditableThresholdPolicy[]>([]);
    const [selected, setSelected] = useState<number | null>(null);
    const [error, setError] = useState('');
    const [revision, setRevision] = useState(0);

    useEffect(() => {
        // Form values can be cloned. Only an external policy change starts a new editing session.
        if (equal(value, published.current)) return;
        const next = load(value);
        published.current = value;
        setPolicy(next);
        drafts.current = makeDrafts(next);
        dragStart.current = null;
        setHistory([]);
        setSelected(null);
        setError('');
        setRevision((previous) => previous + 1);
        onValidityChange?.(true);
    }, [value, load, onValidityChange]);

    const remember = (previous: EditableThresholdPolicy): void => {
        setHistory((items) => [...items.slice(-59), previous]);
    };
    const emit = (next: EditableThresholdPolicy, record = true, numericInput = false): boolean => {
        if (disabled) return false;
        try {
            const serialized = toPolicy(next);
            validateThresholdPolicy(serialized);
            if (record) remember(policy);
            published.current = serialized;
            if (next.mode === 'constant') drafts.current.constant = next;
            else drafts.current.linear = next;
            setPolicy(next);
            setError('');
            onValidityChange?.(true);
            onChange?.(serialized);
            return true;
        } catch (exception: unknown) {
            setError(exception instanceof Error ? exception.message : 'Invalid threshold policy.');
            if (numericInput) onValidityChange?.(false);
            return false;
        }
    };
    const changeMode = (mode: 'constant' | 'linear'): void => {
        setSelected(null);
        if (mode === 'constant') emit(drafts.current.constant);
        else {
            const threshold = policy.mode === 'constant' ? policy.value : 0.4;
            emit(drafts.current.linear ?? {
                type: 'iou',
                mode: 'linear',
                input: 'gt.shape_area',
                extrapolation: 'clamp',
                points: [100, 1000].map((x) => ({ id: nextID.current++, x, y: threshold })),
            });
        }
    };
    const updatePoint = (id: number, field: 'x' | 'y', number: number | null): void => {
        if (policy.mode !== 'linear') return;
        const points = policy.points.map((point) => (
            point.id === id ? { ...point, [field]: number === null ? NaN : number } : point
        )).sort((a, b) => a.x - b.x);
        if (emit({ ...policy, points }, true, true)) setSelected(id);
    };
    const addPoint = (point: ThresholdCoordinates): void => {
        if (policy.mode !== 'linear') return;
        const id = nextID.current++;
        const points = [...policy.points, { ...point, id }].sort((a, b) => a.x - b.x);
        if (emit({ ...policy, points })) setSelected(id);
    };
    const deletePoint = (id: number): void => {
        if (policy.mode !== 'linear' || disabled) return;
        if (policy.points.length <= 2) {
            setError('Interpolation requires at least two points.');
            return;
        }
        if (emit({ ...policy, points: policy.points.filter((point) => point.id !== id) })) setSelected(null);
    };
    const addBetween = (): void => {
        if (policy.mode !== 'linear') return;
        const last = policy.points.at(-1).x;
        const stops = [0.01, ...policy.points.map((point) => point.x), Math.max(last * 1.15, last + 100)];
        let widest = [stops[0], stops[1]];
        for (let i = 1; i < stops.length; i++) {
            if (stops[i] - stops[i - 1] > widest[1] - widest[0]) widest = [stops[i - 1], stops[i]];
        }
        const x = (widest[0] + widest[1]) / 2;
        addPoint({ x, y: evaluateThresholdPolicy(policy, x) });
    };
    const movePoint = (id: number, point: ThresholdCoordinates): void => {
        if (policy.mode !== 'linear') return;
        emit({
            ...policy, points: policy.points.map((current) => (current.id === id ? { ...point, id } : current)),
        }, false);
    };
    const finishDrag = (cancelled: boolean): void => {
        const previous = dragStart.current;
        dragStart.current = null;
        if (!previous) return;
        if (cancelled) emit(previous, false);
        else if (!equal(previous, policy)) remember(previous);
    };
    const undo = (): void => {
        const previous = history.at(-1);
        if (previous && emit(previous, false)) {
            setHistory((items) => items.slice(0, -1));
            setSelected(null);
        }
    };

    return (
        <div className='cvat-threshold-policy-editor'>
            <div className='cvat-threshold-policy-controls'>
                <label htmlFor={`${controlID}-mode`}>
                    Mode
                    <Select id={`${controlID}-mode`} value={policy.mode} onChange={changeMode} disabled={disabled}>
                        <Select.Option value='constant'>Constant</Select.Option>
                        <Select.Option value='linear'>Linear interpolation</Select.Option>
                    </Select>
                </label>
                {policy.mode === 'constant' && (
                    <label htmlFor={`${controlID}-constant`}>
                        IoU threshold (%)
                        <InputNumber
                            id={`${controlID}-constant`}
                            value={Number((policy.value * 100).toPrecision(15))}
                            min={0}
                            max={100}
                            disabled={disabled}
                            onChange={(next) => emit(
                                { type: 'iou', mode: 'constant', value: next === null ? NaN : next / 100 }, true, true,
                            )}
                        />
                    </label>
                )}
                <Button className='cvat-threshold-policy-undo'
                    disabled={disabled || !history.length} icon={<UndoOutlined />} onClick={undo}>
                    Undo
                </Button>
            </div>
            {error && <Alert type='error' message={error} showIcon />}
            {policy.mode === 'linear' && (
                <>
                    <ThresholdPolicyChart key={revision}
                        policy={policy} selected={selected} disabled={disabled}
                        onSelect={setSelected} onAdd={addPoint} onMove={movePoint} onDelete={deletePoint}
                        onDragStart={() => { dragStart.current = policy; }} onDragEnd={finishDrag} />
                    <ThresholdPolicyPoints points={policy.points} selected={selected} disabled={disabled}
                        onSelect={setSelected} onUpdate={updatePoint} onDelete={deletePoint} onAdd={addBetween} />
                </>
            )}
        </div>
    );
}
