// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useEffect, useRef, useState } from 'react';
import Button from 'antd/lib/button';
import Space from 'antd/lib/space';
import { Chart } from 'chart.js/auto';
import { getRelativePosition } from 'chart.js/helpers';
import { evaluateThresholdPolicy } from 'cvat-core/src/quality/threshold-policy';
import { EditableLinearThresholdPolicy, ThresholdCoordinates } from './threshold-policy-editor-types';

interface Props {
    policy: EditableLinearThresholdPolicy;
    selected: number | null;
    disabled: boolean;
    onSelect: (id: number | null) => void;
    onAdd: (point: ThresholdCoordinates) => void;
    onMove: (id: number, point: ThresholdCoordinates) => void;
    onDelete: (id: number) => void;
    onDragStart: () => void;
    onDragEnd: (cancelled: boolean) => void;
}

const format = (value: number): string => value.toLocaleString(undefined, { maximumFractionDigits: 2 });

export default function ThresholdPolicyChart(props: Readonly<Props>): JSX.Element {
    const {
        policy, selected, disabled, onSelect, onAdd, onMove, onDelete, onDragStart, onDragEnd,
    } = props;
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const chartRef = useRef<Chart<'line', ThresholdCoordinates[]> | null>(null);
    const drag = useRef<{ id: number | null; start: ThresholdCoordinates; moved: boolean } | null>(null);
    const [xMax, setXMax] = useState(() => policy.points.at(-1).x * 1.15);
    const [hover, setHover] = useState<{ area: number; threshold: number; left: number; top: number } | null>(null);
    const hoverRef = useRef(hover);
    hoverRef.current = hover;

    useEffect(() => {
        const styles = getComputedStyle(canvasRef.current);
        const color = (name: string): string => styles.getPropertyValue(`--threshold-${name}`).trim();
        const chart = new Chart<'line', ThresholdCoordinates[]>(canvasRef.current, {
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
    }, []);

    useEffect(() => {
        const chart = chartRef.current;
        const styles = getComputedStyle(chart.canvas);
        const color = (name: string): string => styles.getPropertyValue(`--threshold-${name}`).trim();
        chart.options.scales.x.max = xMax;
        chart.data.datasets = [{
            // Synthetic endpoints display clamping and are never editable.
            data: [
                { x: 0, y: policy.points[0].y },
                ...policy.points.filter((point) => point.x <= xMax).map(({ x, y }) => ({ x, y })),
                { x: xMax, y: evaluateThresholdPolicy(policy, xMax) },
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
            data: policy.points.map(({ x, y }) => ({ x, y })),
            showLine: false,
            pointRadius: 7,
            pointHitRadius: 5,
            pointBorderWidth: 3,
            pointBorderColor: color('line'),
            pointBackgroundColor: policy.points.map((point) => color(point.id === selected ? 'line' : 'background')),
        }];
        setHover(null);
        chart.update('none');
    }, [policy, xMax, selected]);

    useEffect(() => {
        chartRef.current?.draw();
    }, [hover]);

    const coordinates = (event: React.PointerEvent<HTMLCanvasElement>): ThresholdCoordinates => (
        getRelativePosition(event.nativeEvent, chartRef.current)
    );
    const inside = (point: ThresholdCoordinates): boolean => {
        const {
            left, right, top, bottom,
        } = chartRef.current.chartArea;
        return point.x >= left && point.x <= right && point.y >= top && point.y <= bottom;
    };
    const valuesAt = (point: ThresholdCoordinates): ThresholdCoordinates => ({
        x: Math.max(0.01, chartRef.current.scales.x.getValueForPixel(point.x)),
        y: Math.min(1, Math.max(0, chartRef.current.scales.y.getValueForPixel(point.y))),
    });
    const pointAt = (event: React.MouseEvent<HTMLCanvasElement>): number | null => {
        const element = chartRef.current.getElementsAtEventForMode(
            event.nativeEvent, 'nearest', { intersect: true }, true,
        ).find((candidate) => candidate.datasetIndex === 1);
        return element ? policy.points[element.index].id : null;
    };
    const pointerDown = (event: React.PointerEvent<HTMLCanvasElement>): void => {
        if (disabled || event.button !== 0 || !chartRef.current) return;
        const start = coordinates(event);
        const id = pointAt(event);
        if (id === null && !inside(start)) return;
        drag.current = { id, start, moved: false };
        if (id !== null) onDragStart();
        onSelect(id);
        setHover(null);
        event.currentTarget.style.setProperty('cursor', id === null ? 'crosshair' : 'grabbing');
        event.currentTarget.setPointerCapture(event.pointerId);
        event.preventDefault();
    };
    const pointerMove = (event: React.PointerEvent<HTMLCanvasElement>): void => {
        if (!chartRef.current) return;
        const point = coordinates(event);
        const numbers = valuesAt(point);
        const active = drag.current;
        if (!active) {
            const cursor = pointAt(event) === null ? 'crosshair' : 'grab';
            event.currentTarget.style.setProperty('cursor', disabled ? 'default' : cursor);
            const rect = event.currentTarget.getBoundingClientRect();
            setHover(inside(point) ? {
                area: numbers.x,
                threshold: evaluateThresholdPolicy(policy, numbers.x),
                left: Math.max(0, Math.min(rect.width - 190, event.clientX - rect.left + 10)),
                top: Math.max(0, event.clientY - rect.top - 70),
            } : null);
            return;
        }
        if (Math.hypot(point.x - active.start.x, point.y - active.start.y) > 3) active.moved = true;
        if (active.id === null || !active.moved) return;
        const index = policy.points.findIndex((candidate) => candidate.id === active.id);
        const minimum = index ? policy.points[index - 1].x : 0;
        const maximum = index + 1 < policy.points.length ? policy.points[index + 1].x : xMax;
        const margin = Math.min(0.01, (maximum - minimum) / 3);
        onMove(active.id, {
            x: Math.max(minimum + margin, Math.min(maximum - margin, numbers.x)),
            y: numbers.y,
        });
    };
    const pointerUp = (event: React.PointerEvent<HTMLCanvasElement>): void => {
        const active = drag.current;
        if (!active) return;
        drag.current = null;
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
        }
        event.currentTarget.style.setProperty('cursor', disabled ? 'default' : 'crosshair');
        if (active.id !== null) onDragEnd(false);
        else if (!active.moved && inside(coordinates(event))) onAdd(valuesAt(coordinates(event)));
    };

    return (
        <>
            <div className='cvat-threshold-policy-toolbar'>
                <span>Minimum IoU (%)</span>
                <Space size={4}>
                    <Button disabled={disabled} size='small' onClick={() => setXMax(Math.max(1, xMax / 1.5))}>+</Button>
                    <Button disabled={disabled} size='small' onClick={() => setXMax(Math.min(1e12, xMax * 1.5))}>−</Button>
                    <Button disabled={disabled} size='small' onClick={() => setXMax(policy.points.at(-1).x * 1.15)}>
                        Fit
                    </Button>
                </Space>
            </div>
            <div className='cvat-threshold-policy-chart'>
                <canvas ref={canvasRef}
                    aria-label='IoU threshold by GT area. Edit points below the graph.'
                    onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp}
                    onPointerLeave={() => { if (!drag.current) setHover(null); }}
                    onPointerCancel={() => {
                        if (drag.current && drag.current.id !== null) onDragEnd(true);
                        drag.current = null;
                        setHover(null);
                    }}
                    onContextMenu={(event) => {
                        event.preventDefault();
                        if (!chartRef.current) return;
                        const id = pointAt(event);
                        if (id !== null) onDelete(id);
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
        </>
    );
}
