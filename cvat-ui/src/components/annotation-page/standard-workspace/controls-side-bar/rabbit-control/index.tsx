// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/**
 * Rabbit tool – quick mask annotation driven by the project's `_geom` tag label.
 *
 * The `_geom` label carries two attributes whose `values[]` map class names to
 * geometry modes:
 *
 *   `_line`   → label names listed here produce a line + buffer mask
 *               (LINE_BUFFER_PX wide).  Auto-completes after 2 clicks.
 *
 *   `_circle` → label names listed here produce a circular mask
 *               (CIRCLE_BUFFER_PX radius).  Auto-completes after 1 click.
 *
 *   Any other label (not listed in either attribute) → polygon mask.
 *   Click ≥ 3 points then press Enter, click "Confirm", or double-click.
 *
 * If no `_geom` label exists in the project, falls back to the first-letter
 * heuristic: C → polygon, L → line, else → circle.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { useDispatch, useSelector } from 'react-redux';
import Icon from '@ant-design/icons';
import Popover from 'antd/lib/popover';
import Button from 'antd/lib/button';
import Text from 'antd/lib/typography/Text';
import { Col, Row } from 'antd/lib/grid';

import { Canvas, convertShapesForInteractor } from 'cvat-canvas-wrapper';
import { getCore, ObjectState, ObjectType, ShapeType } from 'cvat-core-wrapper';
import { ActiveControl, CombinedState } from 'reducers';
import {
    createAnnotationsAsync,
    updateActiveControl as updateActiveControlAction,
} from 'actions/annotation-actions';
import LabelSelector from 'components/label-selector/label-selector';
import CVATTooltip from 'components/common/cvat-tooltip';

import {
    CIRCLE_BUFFER_PX,
    LINE_BUFFER_PX,
    circleVertices,
    lineBufferVertices,
    polygonToMaskPoints,
} from './geometry';
import withVisibilityHandling from '../handle-popover-visibility';

// ─── Types ────────────────────────────────────────────────────────────────────

type LabelMode = 'polygon' | 'line' | 'circle';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Resolves the geometry mode for `labelName` using the project's `_geom` tag
 * label when present.
 *
 * Algorithm:
 *  1. Find the label named `_geom` in `allLabels`.
 *  2. Check its attributes:
 *       - `_line`   attribute → values[] lists the label names that map to 'line'
 *       - `_circle` attribute → values[] lists the label names that map to 'circle'
 *  3. Match: if labelName in _line.values → 'line'
 *            if labelName in _circle.values → 'circle'
 *            otherwise → 'polygon'
 *  4. If no `_geom` label exists fall back to first-letter heuristic.
 */
function getLabelMode(labelName: string, allLabels: any[]): LabelMode {
    const geomLabel = allLabels.find((l: any) => l.name === '_geom');
    if (geomLabel) {
        const attrs: any[] = geomLabel.attributes ?? [];

        const lineAttr = attrs.find((a: any) => a.name === '_line');
        if (lineAttr?.values?.includes(labelName)) return 'line';

        const circleAttr = attrs.find((a: any) => a.name === '_circle');
        if (circleAttr?.values?.includes(labelName)) return 'circle';

        return 'polygon'; // _geom exists but label is not in _line or _circle
    }

    // Fallback: first-letter heuristic
    const first = labelName[0]?.toUpperCase();
    if (first === 'C') return 'polygon';
    if (first === 'L') return 'line';
    return 'circle';
}

/**
 * Number of clicks required to auto-complete (Infinity → user-driven finish).
 */
function getRequiredPointCount(mode: LabelMode): number {
    if (mode === 'polygon') return Infinity; // user confirms explicitly
    if (mode === 'line') return 2;
    return 1;
}

function buildMaskPoints(mode: LabelMode, points: [number, number][]): number[] {
    switch (mode) {
        case 'polygon':
            return polygonToMaskPoints(points); // all collected points
        case 'line': {
            const vertices = lineBufferVertices(points[0], points[1], LINE_BUFFER_PX);
            return polygonToMaskPoints(vertices);
        }
        case 'circle': {
            const vertices = circleVertices(points[0], CIRCLE_BUFFER_PX);
            return polygonToMaskPoints(vertices);
        }
        default:
            return [];
    }
}

function getModeHint(mode: LabelMode): string {
    if (mode === 'polygon') {
        return 'Click to add points, then press Enter or click "Confirm" (min 3 points).';
    }
    if (mode === 'line') {
        return `Click 2 points to define a line mask (${LINE_BUFFER_PX}px buffer).`;
    }
    return `Click 1 point to define a circular mask (${CIRCLE_BUFFER_PX}px radius).`;
}

// ─── Icon ─────────────────────────────────────────────────────────────────────

const RabbitSVGIcon = (): JSX.Element => (
    <svg width='1em' height='1em' viewBox='0 0 24 24' fill='currentColor' xmlns='http://www.w3.org/2000/svg'>
        {/* Left ear */}
        <ellipse cx='9' cy='5.5' rx='2' ry='4' />
        {/* Right ear */}
        <ellipse cx='15' cy='5.5' rx='2' ry='4' />
        {/* Head + body */}
        <ellipse cx='12' cy='15' rx='6' ry='6' />
    </svg>
);

// ─── Floating confirm panel (rendered as a Portal) ────────────────────────────

interface PolygonConfirmPanelProps {
    pointCount: number;
    onConfirm: () => void;
    onCancel: () => void;
}

function PolygonConfirmPanel({ pointCount, onConfirm, onCancel }: PolygonConfirmPanelProps): JSX.Element {
    const canConfirm = pointCount >= 3;

    return ReactDOM.createPortal(
        <div
            style={{
                position: 'fixed',
                left: 54,          // just right of the 44px controls sidebar
                top: '50%',
                transform: 'translateY(-50%)',
                zIndex: 1000,
                background: '#fff',
                border: '1px solid #d9d9d9',
                borderRadius: 4,
                padding: '8px 12px',
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                minWidth: 160,
            }}
            className='cvat-rabbit-polygon-confirm'
        >
            <Text strong style={{ fontSize: 12 }}>Rabbit – polygon</Text>
            <Text style={{ fontSize: 12 }} type={canConfirm ? 'success' : 'secondary'}>
                {pointCount} point{pointCount !== 1 ? 's' : ''}
                {!canConfirm && ' (need ≥ 3)'}
            </Text>
            <Button
                type='primary'
                size='small'
                disabled={!canConfirm}
                onClick={onConfirm}
            >
                Confirm  <kbd style={{ marginLeft: 4, opacity: 0.7, fontSize: 10 }}>Enter</kbd>
            </Button>
            <Button size='small' onClick={onCancel}>Cancel</Button>
        </div>,
        document.body,
    );
}

// ─── Component ────────────────────────────────────────────────────────────────

const core = getCore();
const CustomPopover = withVisibilityHandling(Popover, 'rabbit-control');

function RabbitControl(): JSX.Element {
    const dispatch = useDispatch();

    // ── Redux selectors ──────────────────────────────────────────────────────
    const canvasInstance = useSelector(
        (state: CombinedState) => state.annotation.canvas.instance as Canvas,
    );
    const labels = useSelector((state: CombinedState) => state.annotation.job.labels);
    const frame = useSelector((state: CombinedState) => state.annotation.player.frame.number);
    const curZOrder = useSelector(
        (state: CombinedState) => state.annotation.annotations.zLayer.cur,
    );
    const frameData = useSelector((state: CombinedState) => state.annotation.player.frame.data);
    const activeControl = useSelector(
        (state: CombinedState) => state.annotation.canvas.activeControl,
    );

    // ── Local state ──────────────────────────────────────────────────────────
    const [selectedLabelID, setSelectedLabelID] = useState<number | null>(
        labels.length ? (labels[0].id as number) : null,
    );
    // Live count of collected polygon points (drives the confirm panel UI)
    const [polygonPointsCount, setPolygonPointsCount] = useState(0);

    // Ref holding the latest accumulated points so finishPolygon can access
    // them without being recreated on every point click.
    const latestPointsRef = useRef<[number, number][]>([]);

    // Keep a valid label selected when the label list changes
    useEffect(() => {
        if (labels.length && selectedLabelID === null) {
            setSelectedLabelID(labels[0].id as number);
        }
    }, [labels, selectedLabelID]);

    // Reset polygon counter when the tool is deactivated
    useEffect(() => {
        if (!activeControl || activeControl !== ActiveControl.RABBIT) {
            setPolygonPointsCount(0);
            latestPointsRef.current = [];
        }
    }, [activeControl]);

    // ── Derived values ───────────────────────────────────────────────────────
    const isActive = activeControl === ActiveControl.RABBIT;
    const controlsDisabled = !labels.length || frameData.deleted;
    const selectedLabel = labels.find((l: any) => l.id === selectedLabelID) ?? null;
    const labelMode: LabelMode = selectedLabel ? getLabelMode(selectedLabel.name, labels) : 'circle';
    const requiredPoints = getRequiredPointCount(labelMode);

    // ── Shared finish logic (used by canvas event, Enter key, and button) ────
    const finishPolygon = useCallback((): void => {
        const points = latestPointsRef.current;
        if (points.length >= 3 && selectedLabel) {
            const maskPoints = buildMaskPoints('polygon', points);
            if (maskPoints.length >= 6) {
                const objectState = new core.classes.ObjectState({
                    shapeType: ShapeType.MASK,
                    objectType: ObjectType.SHAPE,
                    source: core.enums.Source.SEMI_AUTO,
                    label: selectedLabel,
                    points: maskPoints,
                    frame,
                    occluded: false,
                    zOrder: curZOrder,
                });
                dispatch(createAnnotationsAsync([objectState]));
            }
        }
        canvasInstance.interact({ enabled: false });
        dispatch(updateActiveControlAction(ActiveControl.CURSOR));
    }, [canvasInstance, dispatch, selectedLabel, frame, curZOrder]);

    // ── Canvas interaction listener ──────────────────────────────────────────
    useEffect(() => {
        if (!canvasInstance || !isActive || !selectedLabel) return (): void => {};

        const handleInteraction = (e: Event): void => {
            const { shapes, finished } = (e as CustomEvent).detail;
            const rawPoints: number[][] = convertShapesForInteractor(shapes, 'points', 'positive');
            const points: [number, number][] = rawPoints.map((p) => [p[0], p[1]]);

            // Always keep the ref / counter up-to-date for polygon mode
            if (labelMode === 'polygon') {
                latestPointsRef.current = points;
                setPolygonPointsCount(points.length);
            }

            const shouldAutoComplete = points.length >= requiredPoints;
            // For polygon mode, the canvas double-click also fires finished=true
            const shouldFinish = shouldAutoComplete || (finished && labelMode === 'polygon' && points.length >= 3);
            const shouldCancelEmpty = finished && !shouldFinish;

            if (shouldFinish) {
                if (labelMode === 'polygon') {
                    finishPolygon();
                } else {
                    const maskPoints = buildMaskPoints(labelMode, points);
                    if (maskPoints.length >= 6) {
                        const objectState = new core.classes.ObjectState({
                            shapeType: ShapeType.MASK,
                            objectType: ObjectType.SHAPE,
                            source: core.enums.Source.SEMI_AUTO,
                            label: selectedLabel,
                            points: maskPoints,
                            frame,
                            occluded: false,
                            zOrder: curZOrder,
                        });
                        dispatch(createAnnotationsAsync([objectState]));
                    }
                    canvasInstance.interact({ enabled: false });
                    dispatch(updateActiveControlAction(ActiveControl.CURSOR));
                }
            } else if (shouldCancelEmpty) {
                // User finished before collecting enough points → just cancel
                canvasInstance.interact({ enabled: false });
                dispatch(updateActiveControlAction(ActiveControl.CURSOR));
            }
        };

        const handleCanceled = (): void => {
            dispatch(updateActiveControlAction(ActiveControl.CURSOR));
        };

        canvasInstance.html().addEventListener('canvas.interacted', handleInteraction);
        canvasInstance.html().addEventListener('canvas.canceled', handleCanceled);

        return (): void => {
            canvasInstance.html().removeEventListener('canvas.interacted', handleInteraction);
            canvasInstance.html().removeEventListener('canvas.canceled', handleCanceled);
        };
    }, [isActive, canvasInstance, selectedLabel, labelMode, requiredPoints,
        frame, curZOrder, dispatch, finishPolygon]);

    // ── Enter key shortcut (polygon mode only) ───────────────────────────────
    useEffect(() => {
        if (!isActive || labelMode !== 'polygon') return (): void => {};

        const handleKeyDown = (e: KeyboardEvent): void => {
            if (e.key === 'Enter' && latestPointsRef.current.length >= 3) {
                e.preventDefault();
                e.stopPropagation();
                finishPolygon();
            }
        };

        window.addEventListener('keydown', handleKeyDown, { capture: true });
        return (): void => {
            window.removeEventListener('keydown', handleKeyDown, { capture: true });
        };
    }, [isActive, labelMode, finishPolygon]);

    // ── Handlers ─────────────────────────────────────────────────────────────
    const handleActivate = useCallback((): void => {
        if (!selectedLabel) return;
        canvasInstance.cancel();
        canvasInstance.interact({
            enabled: true,
            command: 'draw_points',
            settings: { crosshair: true },
        });
        dispatch(updateActiveControlAction(ActiveControl.RABBIT));
    }, [canvasInstance, dispatch, selectedLabel]);

    const handleDeactivate = useCallback((): void => {
        canvasInstance.interact({ enabled: false });
        dispatch(updateActiveControlAction(ActiveControl.CURSOR));
    }, [canvasInstance, dispatch]);

    // ── Popover content ───────────────────────────────────────────────────────
    const popoverContent = (
        <div className='cvat-rabbit-control-popover-content'>
            <Row justify='start'>
                <Col>
                    <Text className='cvat-text-color' strong>
                        Rabbit tool
                    </Text>
                </Col>
            </Row>
            <Row justify='start'>
                <Col>
                    <Text className='cvat-text-color'>Label</Text>
                </Col>
            </Row>
            <Row justify='center'>
                <Col span={24}>
                    <LabelSelector
                        style={{ width: '100%' }}
                        labels={labels}
                        value={selectedLabelID}
                        onChange={(label: any) => setSelectedLabelID(label ? (label.id as number) : null)}
                    />
                </Col>
            </Row>
            {selectedLabel && (
                <Row justify='start' style={{ marginTop: 6 }}>
                    <Col>
                        <Text className='cvat-text-color' type='secondary'>
                            {getModeHint(labelMode)}
                        </Text>
                    </Col>
                </Row>
            )}
            <Row justify='start' style={{ marginTop: 10 }}>
                <Col>
                    <Button
                        type='primary'
                        disabled={!selectedLabel}
                        onClick={handleActivate}
                    >
                        Start
                    </Button>
                </Col>
            </Row>
        </div>
    );

    // ── Render ────────────────────────────────────────────────────────────────
    if (controlsDisabled) {
        return (
            <Icon
                className='cvat-rabbit-control cvat-disabled-canvas-control'
                component={RabbitSVGIcon}
            />
        );
    }

    return (
        <>
            <CustomPopover
                {...(isActive ? { overlayStyle: { display: 'none' } } : {})}
                overlayClassName='cvat-rabbit-control-popover'
                placement='right'
                content={popoverContent}
            >
                <CVATTooltip title='Rabbit tool' placement='right'>
                    <Icon
                        component={RabbitSVGIcon}
                        className={
                            isActive
                                ? 'cvat-rabbit-control cvat-active-canvas-control'
                                : 'cvat-rabbit-control'
                        }
                        onClick={isActive ? handleDeactivate : undefined}
                    />
                </CVATTooltip>
            </CustomPopover>

            {/* Floating confirm panel — only shown while collecting polygon points */}
            {isActive && labelMode === 'polygon' && (
                <PolygonConfirmPanel
                    pointCount={polygonPointsCount}
                    onConfirm={finishPolygon}
                    onCancel={handleDeactivate}
                />
            )}
        </>
    );
}

Object.assign(RabbitControl, { displayName: 'RabbitControl' });
export default React.memo(RabbitControl);
