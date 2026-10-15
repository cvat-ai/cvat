// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/* eslint jsx-a11y/label-has-associated-control: ["error", { "controlComponents": ["Select", "InputNumber"] }] */

import React, {
    useEffect, useId, useRef, useState,
} from 'react';
import { DeleteOutlined, PlusOutlined, UndoOutlined } from '@ant-design/icons';
import Alert from 'antd/lib/alert';
import Button from 'antd/lib/button';
import InputNumber from 'antd/lib/input-number';
import Select from 'antd/lib/select';
import Space from 'antd/lib/space';
import { Chart } from 'chart.js/auto';
import { getRelativePosition } from 'chart.js/helpers';
import { SimilarityThresholdPolicy } from 'cvat-core/src/quality/server-response-types';
import {
    evaluateThresholdPolicy, MAX_THRESHOLD_POINTS, validateThresholdPolicy,
} from 'cvat-core/src/quality/threshold-policy';

interface Props {
    value?: SimilarityThresholdPolicy;
    onChange?: (value: SimilarityThresholdPolicy) => void;
    onValidityChange?: (valid: boolean) => void;
    disabled?: boolean;
}

type Point = { x: number; y: number };
const copy = (policy: SimilarityThresholdPolicy): SimilarityThresholdPolicy => (
    policy.mode === 'constant' ? { ...policy } : { ...policy, points: policy.points.map((point) => ({ ...point })) }
);
const format = (value: number): string => value.toLocaleString(undefined, { maximumFractionDigits: 2 });

export default function ThresholdPolicyEditor(props: Readonly<Props>): JSX.Element {
    const {
        value = { type: 'iou', mode: 'constant', value: 0.4 }, onChange, onValidityChange, disabled = false,
    } = props;
    const controlID = useId();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const chartRef = useRef<Chart<'line', Point[]> | null>(null);
    const drafts = useRef<{ constant: number; linear: Point[] | null }>({ constant: 0.4, linear: null });
    const history = useRef<SimilarityThresholdPolicy[]>([]);
    const pointIdentity = useRef<{ points: Point[]; keys: number[]; next: number }>({
        points: [], keys: [], next: 0,
    });
    const drag = useRef<{
        index: number | null; start: Point; previous: SimilarityThresholdPolicy; moved: boolean;
    } | null>(null);
    const [selected, setSelected] = useState<number | null>(null);
    const [error, setError] = useState('');
    const [undoCount, setUndoCount] = useState(0);
    const [xMax, setXMax] = useState(() => (
        value.mode === 'linear' ? value.points[value.points.length - 1].x * 1.15 : 1150
    ));
    const [hover, setHover] = useState<{ area: number; threshold: number; left: number; top: number } | null>(null);
    const hoverRef = useRef(hover);
    hoverRef.current = hover;

    useEffect(() => {
        if (value.mode !== 'linear') return undefined;
        const styles = getComputedStyle(canvasRef.current);
        const color = (name: string): string => styles.getPropertyValue(`--threshold-${name}`).trim();
        const chart = new Chart<'line', Point[]>(canvasRef.current, {
            type: 'line',
            data: { datasets: [] },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: false,
                events: [],
                scales: {
                    x: {
                        type: 'linear',
                        min: 0,
                        title: { display: true, text: 'GT shape area (px²)', color: color('text') },
                        ticks: { color: color('text'), maxTicksLimit: 6, callback: (tick) => format(Number(tick)) },
                        grid: { color: color('grid') },
                        border: { color: color('grid') },
                    },
                    y: {
                        type: 'linear',
                        min: 0,
                        max: 1,
                        ticks: { color: color('text'), stepSize: 0.2, callback: (tick) => format(Number(tick) * 100) },
                        grid: { color: color('grid') },
                        border: { color: color('grid') },
                    },
                },
                plugins: { legend: { display: false }, tooltip: { enabled: false } },
            },
            plugins: [{
                id: 'threshold-policy-probe',
                afterDatasetsDraw: (instance) => {
                    const area = hoverRef.current?.area;
                    if (area === undefined) return;
                    const x = instance.scales.x.getPixelForValue(area);
                    const { ctx, chartArea } = instance;
                    if (x < chartArea.left || x > chartArea.right) return;
                    ctx.save();
                    ctx.strokeStyle = color('line');
                    ctx.setLineDash([4, 4]);
                    ctx.beginPath();
                    ctx.moveTo(x, chartArea.top);
                    ctx.lineTo(x, chartArea.bottom);
                    ctx.stroke();
                    ctx.restore();
                },
            }],
        });
        chartRef.current = chart;
        return () => {
            chart.destroy();
            chartRef.current = null;
            drag.current = null;
        };
    }, [value.mode]);

    useEffect(() => {
        const chart = chartRef.current;
        if (value.mode !== 'linear' || !chart) return;
        const styles = getComputedStyle(chart.canvas);
        const color = (name: string): string => styles.getPropertyValue(`--threshold-${name}`).trim();
        chart.options.scales.x.max = xMax;
        chart.data.datasets = [{
            // Clamp the curve at both edges without making the synthetic endpoints editable.
            data: [
                { x: 0, y: value.points[0].y },
                ...value.points.filter((point) => point.x <= xMax),
                { x: xMax, y: evaluateThresholdPolicy(value, xMax) },
            ],
            borderColor: color('line'),
            backgroundColor: color('fill'),
            borderWidth: 3,
            pointRadius: 0,
            pointHitRadius: 0,
            fill: true,
            tension: 0,
            order: 1,
        }, {
            data: value.points.map((point) => ({ ...point })),
            showLine: false,
            pointRadius: 7,
            pointHitRadius: 5,
            pointBorderWidth: 3,
            pointBorderColor: color('line'),
            pointBackgroundColor: value.points.map((_, index) => color(index === selected ? 'line' : 'background')),
        }];
        chart.update('none');
    }, [value, xMax, selected]);

    useEffect(() => {
        chartRef.current?.draw();
    }, [hover]);

    useEffect(() => {
        if (value.mode === 'constant') drafts.current.constant = value.value;
        else drafts.current.linear = value.points.map((point) => ({ ...point }));
        setError('');
        onValidityChange?.(true);
    }, [value, onValidityChange]);

    const remember = (previous: SimilarityThresholdPolicy): void => {
        history.current.push(copy(previous));
        if (history.current.length > 60) history.current.shift();
        setUndoCount(history.current.length);
    };
    const emit = (next: SimilarityThresholdPolicy, record = true, numericInput = false): boolean => {
        if (disabled) return false;
        try {
            validateThresholdPolicy(next);
            if (record) remember(value);
            setError('');
            setHover(null);
            onValidityChange?.(true);
            onChange?.(next);
            return true;
        } catch (exception: unknown) {
            setError(exception instanceof Error ? exception.message : 'Invalid threshold policy.');
            if (numericInput) onValidityChange?.(false);
            return false;
        }
    };
    const changeMode = (mode: 'constant' | 'linear'): void => {
        setSelected(null);
        if (mode === 'constant') emit({ type: 'iou', mode, value: drafts.current.constant });
        else {
            const threshold = value.mode === 'constant' ? value.value : 0.4;
            const points = drafts.current.linear ?? [{ x: 100, y: threshold }, { x: 1000, y: threshold }];
            emit({
                type: 'iou', mode, input: 'gt.shape_area', extrapolation: 'clamp', points,
            });
        }
    };
    const updatePoint = (index: number, field: 'x' | 'y', number: number | null): void => {
        if (value.mode !== 'linear') return;
        const point = { ...value.points[index], [field]: number === null ? NaN : number };
        const points = value.points.map((current, i) => (i === index ? point : current)).sort((a, b) => a.x - b.x);
        if (emit({ ...value, points }, true, true)) setSelected(points.indexOf(point));
    };
    const addPoint = (point: Point): void => {
        if (value.mode !== 'linear') return;
        const points = [...value.points, point].sort((a, b) => a.x - b.x);
        if (emit({ ...value, points })) setSelected(points.indexOf(point));
    };
    const deletePoint = (index: number): void => {
        if (value.mode !== 'linear' || disabled) return;
        if (value.points.length <= 2) {
            setError('Interpolation requires at least two points.');
            return;
        }
        emit({ ...value, points: value.points.filter((_, i) => i !== index) });
        setSelected(null);
    };
    const addBetween = (): void => {
        if (value.mode !== 'linear') return;
        const stops = [0.01, ...value.points.map((p) => p.x), Math.max(xMax, value.points.at(-1).x + 100)];
        let widest = [stops[0], stops[1]];
        for (let i = 1; i < stops.length; i++) {
            if (stops[i] - stops[i - 1] > widest[1] - widest[0]) widest = [stops[i - 1], stops[i]];
        }
        const x = (widest[0] + widest[1]) / 2;
        addPoint({ x, y: evaluateThresholdPolicy(value, x) });
    };
    const coordinates = (event: React.PointerEvent<HTMLCanvasElement>): Point => (
        getRelativePosition(event.nativeEvent, chartRef.current)
    );
    const inside = (p: Point): boolean => {
        const {
            left, right, top, bottom,
        } = chartRef.current.chartArea;
        return p.x >= left && p.x <= right && p.y >= top && p.y <= bottom;
    };
    const valuesAt = (p: Point): Point => ({
        x: Math.max(0.01, chartRef.current.scales.x.getValueForPixel(p.x)),
        y: Math.min(1, Math.max(0, chartRef.current.scales.y.getValueForPixel(p.y))),
    });
    const pointAt = (event: React.MouseEvent<HTMLCanvasElement>): number | null => (
        chartRef.current.getElementsAtEventForMode(event.nativeEvent, 'nearest', { intersect: true }, true)
            .find((element) => element.datasetIndex === 1)?.index ?? null
    );
    const pointerDown = (event: React.PointerEvent<HTMLCanvasElement>): void => {
        if (disabled || event.button !== 0 || !chartRef.current) return;
        const p = coordinates(event);
        const index = pointAt(event);
        if (index === null && !inside(p)) return;
        drag.current = {
            index, start: p, previous: copy(value), moved: false,
        };
        setSelected(index);
        setHover(null);
        event.currentTarget.style.setProperty('cursor', index === null ? 'crosshair' : 'grabbing');
        event.currentTarget.setPointerCapture(event.pointerId);
        event.preventDefault();
    };
    const pointerMove = (event: React.PointerEvent<HTMLCanvasElement>): void => {
        if (value.mode !== 'linear' || !chartRef.current) return;
        const p = coordinates(event);
        const numbers = valuesAt(p);
        const active = drag.current;
        if (!active) {
            const cursor = pointAt(event) === null ? 'crosshair' : 'grab';
            event.currentTarget.style.setProperty('cursor', disabled ? 'default' : cursor);
            const rect = event.currentTarget.getBoundingClientRect();
            setHover(inside(p) ? {
                area: numbers.x,
                threshold: evaluateThresholdPolicy(value, numbers.x),
                left: Math.max(0, Math.min(rect.width - 190, event.clientX - rect.left + 10)),
                top: Math.max(0, event.clientY - rect.top - 70),
            } : null);
            return;
        }
        if (Math.hypot(p.x - active.start.x, p.y - active.start.y) > 3) active.moved = true;
        if (active.index === null || !active.moved) return;
        const { index } = active;
        const minimum = index ? value.points[index - 1].x : 0;
        const maximum = index + 1 < value.points.length ? value.points[index + 1].x : xMax;
        const margin = Math.min(0.01, (maximum - minimum) / 3);
        const point = {
            x: Math.max(minimum + margin, Math.min(maximum - margin, numbers.x)),
            y: numbers.y,
        };
        emit({ ...value, points: value.points.map((current, i) => (i === index ? point : current)) }, false);
    };
    const pointerUp = (event: React.PointerEvent<HTMLCanvasElement>): void => {
        const active = drag.current;
        if (!active) return;
        drag.current = null;
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
        }
        event.currentTarget.style.setProperty('cursor', disabled ? 'default' : 'crosshair');
        if (active.index !== null && active.moved) remember(active.previous);
        else if (active.index === null && !active.moved && inside(coordinates(event))) {
            addPoint(valuesAt(coordinates(event)));
        }
    };
    const undo = (): void => {
        const previous = history.current.pop();
        setUndoCount(history.current.length);
        if (previous) { onChange?.(previous); setSelected(null); setError(''); setHover(null); }
    };

    // Preserve the edited input's identity when its new area changes the row order.
    // These keys belong to the editor only and are never sent in the policy.
    const identity = pointIdentity.current;
    if (value.mode === 'linear' && identity.points !== value.points) {
        const keys = value.points.map((point) => {
            const previous = identity.points.findIndex((p) => p.x === point.x && p.y === point.y);
            return previous < 0 ? null : identity.keys[previous];
        });
        const unused = identity.keys.filter((key) => !keys.includes(key));
        const changed = keys.filter((key) => key === null).length;
        identity.keys = keys.map((key) => {
            if (key !== null) return key;
            if (changed === 1 && unused.length === 1) return unused[0];
            return identity.next++;
        });
        identity.points = value.points;
    }

    return (
        <div className='cvat-threshold-policy-editor'>
            <div className='cvat-threshold-policy-controls'>
                <label htmlFor={`${controlID}-mode`}>
                    Mode
                    <Select id={`${controlID}-mode`} value={value.mode} onChange={changeMode} disabled={disabled}>
                        <Select.Option value='constant'>Constant</Select.Option>
                        <Select.Option value='linear'>Linear interpolation</Select.Option>
                    </Select>
                </label>
                {value.mode === 'constant' && (
                    <label htmlFor={`${controlID}-constant`}>
                        IoU threshold (%)
                        <InputNumber
                            id={`${controlID}-constant`}
                            value={value.value * 100}
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
                    disabled={disabled || !undoCount} icon={<UndoOutlined />} onClick={undo}>
                    Undo
                </Button>
            </div>
            {error && <Alert type='error' message={error} showIcon />}
            {value.mode === 'linear' && (
                <>
                    <div className='cvat-threshold-policy-toolbar'>
                        <span>Minimum IoU (%)</span>
                        <Space size={4}>
                            <Button disabled={disabled} size='small' onClick={() => setXMax(Math.max(1, xMax / 1.5))}>+</Button>
                            <Button disabled={disabled} size='small' onClick={() => setXMax(Math.min(1e12, xMax * 1.5))}>−</Button>
                            <Button disabled={disabled} size='small' onClick={() => setXMax(value.points.at(-1).x * 1.15)}>Fit</Button>
                        </Space>
                    </div>
                    <div className='cvat-threshold-policy-chart'>
                        <canvas
                            ref={canvasRef}
                            aria-label='IoU threshold by GT area. Edit points below the graph.'
                            onPointerDown={pointerDown}
                            onPointerMove={pointerMove}
                            onPointerUp={pointerUp}
                            onPointerLeave={() => { if (!drag.current) setHover(null); }}
                            onPointerCancel={() => {
                                if (drag.current) onChange?.(drag.current.previous);
                                drag.current = null;
                                setHover(null);
                            }}
                            onContextMenu={(event) => {
                                event.preventDefault();
                                if (!chartRef.current) return;
                                const index = pointAt(event);
                                if (index !== null) deletePoint(index);
                            }}
                        />
                        {hover && (
                            <div className='cvat-threshold-policy-tooltip' style={{ left: hover.left, top: hover.top }}>
                                <div>GT area: {format(hover.area)} px²</div>
                                <strong>IoU threshold: {format(hover.threshold * 100)}%</strong>
                            </div>
                        )}
                    </div>
                    <p className='cvat-threshold-policy-hint'>
                        Left-click to add. Hold left mouse button on a point to move. Right-click a point to delete.
                    </p>
                    <div className='cvat-threshold-policy-toolbar'>
                        <strong>Key points ({value.points.length})</strong>
                        <Button disabled={disabled || value.points.length >= MAX_THRESHOLD_POINTS}
                            icon={<PlusOutlined />} onClick={addBetween}>Add point</Button>
                    </div>
                    <div className='cvat-threshold-policy-points'>
                        {value.points.map((point, index) => (
                            // Keep inputs mounted while editing a point's coordinates.

                            <div key={identity.keys[index]}
                                className={`cvat-threshold-policy-row${selected === index ? ' selected' : ''}`}>
                                <strong>Point {index + 1}</strong>
                                <label htmlFor={`${controlID}-area-${index}`}>
                                    GT area (px²)
                                    <InputNumber id={`${controlID}-area-${index}`} value={point.x} min={0.000001}
                                        disabled={disabled} onFocus={() => setSelected(index)}
                                        onChange={(next) => updatePoint(index, 'x', next)} />
                                </label>
                                <label htmlFor={`${controlID}-iou-${index}`}>
                                    IoU (%)
                                    <InputNumber id={`${controlID}-iou-${index}`}
                                        value={Number((point.y * 100).toPrecision(15))}
                                        min={0} max={100} disabled={disabled}
                                        onFocus={() => setSelected(index)}
                                        onChange={(next) => updatePoint(index, 'y', next === null ? null : next / 100)} />
                                </label>
                                <Button icon={<DeleteOutlined />} aria-label={`Delete point ${index + 1}`}
                                    disabled={disabled || value.points.length <= 2}
                                    onClick={() => deletePoint(index)} />
                            </div>
                        ))}
                    </div>
                    <p className='cvat-threshold-policy-hint'>
                        Linear interpolation between points. Outside their range, the nearest endpoint is used.
                    </p>
                </>
            )}
        </div>
    );
}
