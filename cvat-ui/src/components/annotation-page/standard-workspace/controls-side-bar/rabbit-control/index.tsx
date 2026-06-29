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
 *   Any other label (not listed in either attribute) → polygon shape.
 *   Uses the standard polygon draw tool (lines between points visible).
 *   Double-click or press Enter to finish (min 3 points).
 *
 * If no `_geom` label exists in the project, falls back to the first-letter
 * heuristic: C → polygon, L → line, else → circle.
 *
 * `labelSelectorMode` prop (default `'list'`):
 *   'list'     — the popover shows all labels as one-click buttons that
 *                immediately start the annotation.  Saves one click.
 *   'dropdown' — classic LabelSelector dropdown + "Start" button.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
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
    rememberObject,
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

/** How the label is presented in the popover. */
type LabelSelectorMode = 'list' | 'dropdown';

export interface Props {
    /**
     * Controls how labels are presented inside the popover.
     *
     * - `'list'`     (default) → flat list of one-click label buttons; clicking
     *                            a label starts the annotation immediately.
     * - `'dropdown'` → classic dropdown selector + "Start" button.
     */
    labelSelectorMode?: LabelSelectorMode;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Resolves the geometry mode for `labelName` using the project's `_geom` tag
 * label when present.
 */
function getLabelMode(labelName: string, allLabels: any[]): LabelMode {
    const geomLabel = allLabels.find((l: any) => l.name === '_geom');
    if (geomLabel) {
        const attrs: any[] = geomLabel.attributes ?? [];

        const lineAttr = attrs.find((a: any) => a.name === '_line');
        if (lineAttr?.values?.includes(labelName)) return 'line';

        const circleAttr = attrs.find((a: any) => a.name === '_circle');
        if (circleAttr?.values?.includes(labelName)) return 'circle';

        return 'polygon';
    }

    const first = labelName[0]?.toUpperCase();
    if (first === 'C') return 'polygon';
    if (first === 'L') return 'line';
    return 'circle';
}

function getRequiredPointCount(mode: LabelMode): number {
    // polygon uses the native draw tool; only line/circle need auto-complete counts
    if (mode === 'line') return 2;
    return 1; // circle
}

function buildMaskPoints(mode: LabelMode, points: [number, number][]): number[] {
    switch (mode) {
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
    if (mode === 'polygon') return 'Draw a polygon shape (lines visible). Double-click or press Enter to finish (min 3 points).';
    if (mode === 'line') return `Click 2 points to define a line mask (${LINE_BUFFER_PX}px buffer).`;
    return `Click 1 point to define a circular mask (${CIRCLE_BUFFER_PX}px radius).`;
}

/** Small Unicode glyph used in the list-mode button to indicate geometry mode. */
function getModeGlyph(mode: LabelMode): string {
    if (mode === 'polygon') return '◆';
    if (mode === 'line') return '━';
    return '●';
}

// ─── Icon ─────────────────────────────────────────────────────────────────────

const RabbitSVGIcon = (): JSX.Element => (
<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path
    d="M9.4 10.2C7.7 6.6 7.1 2.9 8.6 2.2C10 1.5 11.5 5 11.8 8.6C12.9 5 15.1 1.6 16.6 2.4C18.1 3.2 16.7 6.9 14.9 10.2C17.5 11.1 19 13.2 19 15.8C19 19.1 15.9 21.5 12 21.5C8.1 21.5 5 19.1 5 15.8C5 13.2 6.6 11.1 9.4 10.2Z"
    fill="white"
    stroke="black"
    stroke-width="1.5"
    stroke-linecap="round"
    stroke-linejoin="round"
  />
  <circle cx="9.6" cy="14.6" r="0.9" fill="black"/>
  <circle cx="14.4" cy="14.6" r="0.9" fill="black"/>
  <path
    d="M11.5 17.3C11.8 17.6 12.2 17.6 12.5 17.3"
    stroke="black"
    stroke-width="1.3"
    stroke-linecap="round"
  />
</svg>
);

// ─── Component ────────────────────────────────────────────────────────────────

const core = getCore();
const CustomPopover = withVisibilityHandling(Popover, 'rabbit-control');

function RabbitControl(props: Props): JSX.Element {
    const { labelSelectorMode = 'list' } = props;
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
    /**
     * Guards against the canvas firing `canvas.interacted` for every mouse-move
     * (preview updates).  Once we have decided to finish an interaction we flip
     * this to `true`; subsequent events are ignored until the next activation.
     * Only used for line/circle modes (polygon uses the native draw tool).
     */
    const interactionDoneRef = useRef(false);

    useEffect(() => {
        if (labels.length && selectedLabelID === null) {
            setSelectedLabelID(labels[0].id as number);
        }
    }, [labels, selectedLabelID]);

    useEffect(() => {
        if (!activeControl || activeControl !== ActiveControl.RABBIT) {
            interactionDoneRef.current = false;
        }
    }, [activeControl]);

    // ── Derived values ───────────────────────────────────────────────────────
    /**
     * isActive is true only when the rabbit tool is running an interact()
     * session (i.e. line or circle mode).  Polygon mode dispatches
     * DRAW_POLYGON and is handled entirely by the canvas-wrapper.
     */
    const isActive = activeControl === ActiveControl.RABBIT;
    const controlsDisabled = !labels.length || frameData.deleted;
    const selectedLabel = labels.find((l: any) => l.id === selectedLabelID) ?? null;
    const labelMode: LabelMode = selectedLabel ? getLabelMode(selectedLabel.name, labels) : 'circle';
    const requiredPoints = getRequiredPointCount(labelMode);

    // Labels shown in the list/dropdown (exclude _geom and tag-type labels)
    const annotationLabels = labels.filter(
        (l: any) => l.name !== '_geom' && l.type !== ObjectType.TAG,
    );

    // ── Canvas interaction listener (line / circle modes only) ───────────────
    // Polygon mode uses canvasInstance.draw() and is handled by the
    // canvas-wrapper's canvas.drawn listener — no custom listener needed.
    useEffect(() => {
        if (!canvasInstance || !isActive || !selectedLabel) return (): void => {};

        const handleInteraction = (e: Event): void => {
            const { shapes, finished } = (e as CustomEvent).detail;
            const rawPoints: number[][] = convertShapesForInteractor(shapes, 'points', 'positive');
            const points: [number, number][] = rawPoints.map((p) => [p[0], p[1]]);

            const shouldAutoComplete = points.length >= requiredPoints;
            const shouldCancelEmpty = finished && !shouldAutoComplete;

            if (shouldAutoComplete) {
                if (interactionDoneRef.current) return; // already handled
                interactionDoneRef.current = true;
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
            } else if (shouldCancelEmpty) {
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
        frame, curZOrder, dispatch]);

    // ── Suppress "Draw point prompts" hint while active (interact modes) ─────
    //
    // The canvas fires `canvas.message` with topic='interaction' to show the
    // "Draw point prompts" / "Draw rectangle prompts" tooltip.  We intercept
    // it in the CAPTURE phase (runs before the canvas-wrapper's bubble-phase
    // listener) and call stopImmediatePropagation so the hint is never shown.
    useEffect(() => {
        if (!isActive || !canvasInstance) return (): void => {};

        const suppressHint = (e: Event): void => {
            const { topic } = (e as CustomEvent).detail ?? {};
            if (topic === 'interaction') {
                e.stopImmediatePropagation();
            }
        };

        canvasInstance.html().addEventListener('canvas.message', suppressHint, { capture: true });
        return (): void => {
            canvasInstance.html().removeEventListener('canvas.message', suppressHint, { capture: true });
        };
    }, [isActive, canvasInstance]);

    // ── Handlers ─────────────────────────────────────────────────────────────
    /**
     * Starts the annotation.
     *
     * - Polygon mode: delegates to `canvasInstance.draw()` with ShapeType.POLYGON
     *   so the user sees connecting lines between points (same as the standard
     *   polygon tool).  The canvas-wrapper handles `canvas.drawn` and creates
     *   a POLYGON annotation automatically.
     *
     * - Line / circle modes: uses `canvasInstance.interact()` to collect points
     *   and then creates a MASK annotation with the appropriate geometry.
     *
     * `labelOverride` — when provided (list mode), this label is used
     * immediately and `selectedLabelID` is updated in parallel.
     */
    const handleActivate = useCallback((labelOverride?: any): void => {
        const labelToUse = labelOverride ?? selectedLabel;
        if (!labelToUse) return;
        interactionDoneRef.current = false; // reset for new interaction
        if (labelOverride && labelOverride.id !== selectedLabelID) {
            setSelectedLabelID(labelOverride.id as number);
        }
        const mode = getLabelMode(labelToUse.name, labels);
        canvasInstance.cancel();

        if (mode === 'polygon') {
            // ── Polygon: use the native polygon draw path ──────────────────
            // This shows connecting lines between vertices (like the standard
            // polygon tool), and lets canvas-wrapper create the POLYGON shape.
            dispatch(rememberObject({
                activeObjectType: ObjectType.SHAPE,
                activeShapeType: ShapeType.POLYGON,
                activeLabelID: labelToUse.id,
            }));
            canvasInstance.draw({
                enabled: true,
                shapeType: ShapeType.POLYGON,
                crosshair: false,
            });
            dispatch(updateActiveControlAction(ActiveControl.DRAW_POLYGON));
        } else {
            // ── Line / circle: use interact() to collect points ────────────
            canvasInstance.interact({
                enabled: true,
                command: 'draw_points',
                settings: { crosshair: true },
            });
            dispatch(updateActiveControlAction(ActiveControl.RABBIT));
        }
    }, [canvasInstance, dispatch, selectedLabel, selectedLabelID, labels]);

    const handleDeactivate = useCallback((): void => {
        canvasInstance.interact({ enabled: false });
        dispatch(updateActiveControlAction(ActiveControl.CURSOR));
    }, [canvasInstance, dispatch]);

    // ── Popover content ───────────────────────────────────────────────────────
    const listModeContent = (
        <div className='cvat-rabbit-control-popover-content'>
            <Row justify='start' style={{ marginBottom: 6 }}>
                <Col>
                    <Text className='cvat-text-color' strong>Rabbit tool</Text>
                </Col>
            </Row>
            {annotationLabels.map((label: any) => {
                const mode = getLabelMode(label.name, labels);
                return (
                    <Row key={label.id} style={{ marginTop: 2 }}>
                        <Col span={24}>
                            <Button
                                block
                                style={{ textAlign: 'left' }}
                                onClick={() => handleActivate(label)}
                            >
                                <span
                                    style={{ opacity: 0.55, marginRight: 6, fontStyle: 'normal' }}
                                    title={mode}
                                >
                                    {getModeGlyph(mode)}
                                </span>
                                {label.name}
                            </Button>
                        </Col>
                    </Row>
                );
            })}
        </div>
    );

    const dropdownModeContent = (
        <div className='cvat-rabbit-control-popover-content'>
            <Row justify='start'>
                <Col>
                    <Text className='cvat-text-color' strong>Rabbit tool</Text>
                </Col>
            </Row>
            <Row justify='start'>
                <Col><Text className='cvat-text-color'>Label</Text></Col>
            </Row>
            <Row justify='center'>
                <Col span={24}>
                    <LabelSelector
                        style={{ width: '100%' }}
                        labels={annotationLabels}
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
                    <Button type='primary' disabled={!selectedLabel} onClick={() => handleActivate()}>
                        Start
                    </Button>
                </Col>
            </Row>
        </div>
    );

    const popoverContent = labelSelectorMode === 'list' ? listModeContent : dropdownModeContent;

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
    );
}

Object.assign(RabbitControl, { displayName: 'RabbitControl' });
export default React.memo(RabbitControl);
