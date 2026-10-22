// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/* eslint jsx-a11y/label-has-associated-control:
    ["error", { "controlComponents": ["Select", "ThresholdPolicyInput"] }] */

import React, {
    useCallback, useEffect, useId, useRef, useState,
} from 'react';
import { UndoOutlined } from '@ant-design/icons';
import Button from 'antd/lib/button';
import Select from 'antd/lib/select';
import CVATTooltip from 'components/common/cvat-tooltip';
import { SimilarityThresholdPolicy } from 'cvat-core/src/quality/server-response-types';
import {
    evaluateThresholdPolicy, MAX_THRESHOLD_POINTS, validateThresholdPolicy,
} from 'cvat-core/src/quality/threshold-policy';
import ThresholdPolicyChart from './threshold-policy-chart';
import ThresholdPolicyPoints from './threshold-policy-points';
import ThresholdPolicyInput, { thresholdValueError } from './threshold-policy-input';
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
        ...policy, points: policy.points.map(({ x, y }) => ({ x, y })).sort((a, b) => a.x - b.x),
    }
);

const equal = (a: SimilarityThresholdPolicy, b: SimilarityThresholdPolicy): boolean => {
    if (a.mode === 'constant') return b.mode === 'constant' && Object.is(a.value, b.value);
    return b.mode === 'linear' && a.points.length === b.points.length &&
        a.points.every((point, index) => (
            Object.is(point.x, b.points[index].x) && Object.is(point.y, b.points[index].y)
        ));
};

const makeDrafts = (policy: EditableThresholdPolicy): {
    constant: typeof DEFAULT_POLICY;
    linear: EditableLinearThresholdPolicy | null;
} => ({
    constant: policy.mode === 'constant' ? policy : DEFAULT_POLICY,
    linear: policy.mode === 'linear' ? policy : null,
});

interface Edit {
    policy: EditableThresholdPolicy;
    action: string;
}

interface Drag {
    before: EditableLinearThresholdPolicy;
    current: EditableLinearThresholdPolicy;
    pointID: number | null;
}

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
    const [chartPolicy, setChartPolicy] = useState(() => (policy.mode === 'linear' ? policy : null));
    const published = useRef(value);
    const drafts = useRef(makeDrafts(policy));
    const drag = useRef<Drag | null>(null);
    const numericEdit = useRef<EditableThresholdPolicy | null>(null);
    const [history, setHistory] = useState<Edit[]>([]);
    const [selected, setSelected] = useState<number | null>(null);
    const [reveal, setReveal] = useState<{ id: number } | null>(null);
    const [valid, setValid] = useState(true);
    const [revision, setRevision] = useState(0);

    useEffect(() => {
        // Form values can be cloned. Only an external policy change starts a new editing session.
        if (equal(value, published.current)) return;
        const next = load(value);
        published.current = value;
        setPolicy(next);
        setChartPolicy(next.mode === 'linear' ? next : null);
        drafts.current = makeDrafts(next);
        drag.current = null;
        numericEdit.current = null;
        setHistory([]);
        setSelected(null);
        setReveal(null);
        setValid(true);
        setRevision((previous) => previous + 1);
        onValidityChange?.(true);
    }, [value, load, onValidityChange]);

    const remember = (previous: EditableThresholdPolicy, action: string): void => {
        setHistory((items) => [...items.slice(-59), { policy: previous, action }]);
    };
    const emit = (next: EditableThresholdPolicy, action?: string, publish = true): boolean => {
        if (disabled) return false;
        if (action && !equal(next, policy)) remember(policy, action);
        setPolicy(next);
        if (next.mode === 'constant') drafts.current.constant = next;
        else drafts.current.linear = next;
        try {
            const serialized = toPolicy(next);
            validateThresholdPolicy(serialized);
            if (next.mode === 'linear') {
                setChartPolicy({ ...next, points: [...next.points].sort((a, b) => a.x - b.x) });
            }
            if (publish) {
                const changed = !equal(serialized, published.current);
                published.current = serialized;
                if (changed) onChange?.(serialized);
            }
            setValid(true);
            if (publish) onValidityChange?.(true);
            return true;
        } catch {
            // Keep invalid numeric drafts in their cells, without publishing them to the form or chart.
            setValid(false);
            onValidityChange?.(false);
            return false;
        }
    };
    const selectPoint = (id: number | null): void => {
        setSelected(id);
        setReveal(id === null ? null : { id });
    };
    const updateNumber = (next: EditableThresholdPolicy, action: string): void => {
        if (disabled || equal(next, policy)) return;
        if (!numericEdit.current) {
            numericEdit.current = policy;
            remember(policy, action);
        }
        emit(next);
    };
    const finishNumericEdit = (): void => {
        const previous = numericEdit.current;
        numericEdit.current = null;
        if (!previous) return;
        if (equal(previous, policy)) {
            setHistory((items) => (items.at(-1)?.policy === previous ? items.slice(0, -1) : items));
        }
        if (policy.mode === 'linear' && valid) {
            emit({ ...policy, points: [...policy.points].sort((a, b) => a.x - b.x) });
        }
    };
    const changeMode = (mode: 'constant' | 'linear'): void => {
        numericEdit.current = null;
        setSelected(null);
        const action = `switch to ${mode === 'constant' ? 'constant' : 'linear interpolation'} mode`;
        if (mode === 'constant') emit(drafts.current.constant, action);
        else {
            const threshold = policy.mode === 'constant' && valid ? policy.value : DEFAULT_POLICY.value;
            emit(drafts.current.linear ?? {
                type: 'iou',
                mode: 'linear',
                input: 'gt.shape_area',
                extrapolation: 'clamp',
                points: [100, 1000].map((x) => ({ id: nextID.current++, x, y: threshold })),
            }, action);
        }
    };
    const updatePoint = (id: number, field: 'x' | 'y', number: number | null): void => {
        if (policy.mode !== 'linear') return;
        const points = policy.points.map((point) => (
            point.id === id ? { ...point, [field]: number === null ? NaN : number } : point
        ));
        updateNumber({ ...policy, points }, `change ${field === 'x' ? 'GT area' : 'IoU'} of point ${
            policy.points.findIndex((point) => point.id === id) + 1
        }`);
        setSelected(id);
    };
    const addPoint = (point: ThresholdCoordinates): void => {
        if (policy.mode !== 'linear' || !valid || policy.points.length >= MAX_THRESHOLD_POINTS) return;
        const existing = policy.points.find((current) => current.x === point.x);
        if (existing) { selectPoint(existing.id); return; }
        const id = nextID.current++;
        const points = [...policy.points, { ...point, id }].sort((a, b) => a.x - b.x);
        if (emit({ ...policy, points }, 'add a point')) selectPoint(id);
    };
    const deletePoint = (id: number): void => {
        if (policy.mode !== 'linear' || disabled) return;
        if (policy.points.length <= 2) return;
        emit({ ...policy, points: policy.points.filter((point) => point.id !== id) },
            `delete point ${policy.points.findIndex((point) => point.id === id) + 1}`);
        setSelected(null);
    };
    const addBetween = (): void => {
        if (policy.mode !== 'linear' || !valid) return;
        const ordered = [...policy.points].sort((a, b) => a.x - b.x);
        const last = ordered.at(-1).x;
        const stops = [0, ...ordered.map((point) => point.x), Math.max(last * 1.15, last + 100)];
        let widest = [stops[0], stops[1]];
        for (let i = 1; i < stops.length; i++) {
            if (stops[i] - stops[i - 1] > widest[1] - widest[0]) widest = [stops[i - 1], stops[i]];
        }
        const x = (widest[0] + widest[1]) / 2;
        addPoint({ x, y: evaluateThresholdPolicy({ ...policy, points: ordered }, x) });
    };
    const movePoint = (id: number, point: ThresholdCoordinates): void => {
        if (policy.mode !== 'linear') return;
        const current = drag.current?.current ?? policy;
        const next = {
            ...current, points: current.points.map((item) => (item.id === id ? { ...point, id } : item)),
        };
        if (drag.current) {
            drag.current.current = next;
            drag.current.pointID = id;
        }
        // Intermediate coordinates stay local until the pointer is released.
        emit(next, undefined, false);
    };
    const finishDrag = (cancelled: boolean): void => {
        const completed = drag.current;
        drag.current = null;
        if (!completed) return;
        if (cancelled) emit(completed.before, undefined, false);
        else if (!equal(completed.before, completed.current)) {
            remember(completed.before, `move point ${
                completed.before.points.findIndex((point) => point.id === completed.pointID) + 1
            }`);
            emit(completed.current);
        }
    };
    const undo = (): void => {
        const previous = history.at(-1);
        if (previous && !disabled) {
            numericEdit.current = null;
            emit(previous.policy);
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
                    <div>
                        <label htmlFor={`${controlID}-constant`}>IoU threshold (%)</label>
                        <ThresholdPolicyInput id={`${controlID}-constant`} label='IoU threshold (%)'
                            value={policy.value} percentage error={thresholdValueError(policy.value)}
                            disabled={disabled}
                            onCommit={finishNumericEdit}
                            onChange={(next) => updateNumber(
                                { type: 'iou', mode: 'constant', value: next === null ? NaN : next },
                                'change the constant IoU threshold',
                            )}
                        />
                    </div>
                )}
                <CVATTooltip title={history.length ?
                    `Undo: ${history.at(-1).action}. Only changes in this curve editor are undone.` :
                    'No changes to undo in this curve editor.'}>
                    <span className='cvat-threshold-policy-undo'>
                        <Button disabled={disabled || !history.length} icon={<UndoOutlined />} onClick={undo}>
                            Undo
                        </Button>
                    </span>
                </CVATTooltip>
            </div>
            {policy.mode === 'linear' && (
                <>
                    <ThresholdPolicyChart key={`chart-${revision}`}
                        policy={chartPolicy} selected={selected} disabled={disabled || !valid}
                        onSelect={selectPoint} onAdd={addPoint} onMove={movePoint} onDelete={deletePoint}
                        onDragStart={() => { drag.current = { before: policy, current: policy, pointID: null }; }}
                        onDragEnd={finishDrag} />
                    <ThresholdPolicyPoints key={`points-${revision}`} points={policy.points}
                        selected={selected} reveal={reveal}
                        disabled={disabled} valid={valid} onSelect={setSelected} onUpdate={updatePoint}
                        onCommit={finishNumericEdit} onDelete={deletePoint} onAdd={addBetween} />
                </>
            )}
        </div>
    );
}
