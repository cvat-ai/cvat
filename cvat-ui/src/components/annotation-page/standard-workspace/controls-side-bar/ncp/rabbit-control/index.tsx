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
 *
 * When the user presses a label-switching shortcut (Ctrl+N) while idle in NCP
 * mode, a `ncp:select-label` DOM event is dispatched.  The RabbitControl
 * intercepts it, highlights the corresponding label in the popover, and opens
 * the popover so the user can confirm and start the annotation.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Icon from '@ant-design/icons';
import Popover from 'antd/lib/popover';
import Button from 'antd/lib/button';
import message from 'antd/lib/message';
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
import CVATTooltip from 'components/common/cvat-tooltip';

import {
    CIRCLE_BUFFER_PX,
    LINE_BUFFER_PX,
    circleVertices,
    lineBufferVertices,
    polygonToMaskPoints,
} from './geometry';
import withVisibilityHandling from '../../handle-popover-visibility';
import { RabbitSVGIcon } from 'icons';

// ─── Types ────────────────────────────────────────────────────────────────────

type LabelMode = 'polygon' | 'line' | 'circle';


export interface Props {
    /** Currently selected label ID – lifted to the parent sidebar. */
    selectedLabelID: number | null;
    /** Setter for the selected label ID – lifted to the parent sidebar. */
    setSelectedLabelID: (id: number | null) => void;
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

/** Small Unicode glyph used in the list-mode button to indicate geometry mode. */
function getModeGlyph(mode: LabelMode): string {
    if (mode === 'polygon') return '◆';
    if (mode === 'line') return '━';
    return '●';
}

// ─── Component ────────────────────────────────────────────────────────────────

const core = getCore();
const CustomPopover = withVisibilityHandling(Popover, 'rabbit-control');

function RabbitControl(props: Props): JSX.Element {
    const {selectedLabelID, setSelectedLabelID } = props;
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

    const activeControl = useSelector(
        (state: CombinedState) => state.annotation.canvas.activeControl,
    );

    // ── Local state ──────────────────────────────────────────────────────────
    /**
     * ID of the label that was highlighted via the Ctrl+N keyboard shortcut.
     * `null` means no shortcut-driven highlight is active.
     */
    const [shortcutHighlightedLabelID, setShortcutHighlightedLabelID] = useState<number | null>(null);
    /**
     * Controlled open state for the popover.
     * `undefined` → uncontrolled (trigger-based click to open).
     * `true`      → force-open (triggered by keyboard shortcut).
     * `false`     → force-closed (while drawing).
     */
    const [popoverOpen, setPopoverOpen] = useState<boolean | undefined>(undefined);
    /**
     * Guards against the canvas firing `canvas.interacted` for every mouse-move
     * (preview updates).  Once we have decided to finish an interaction we flip
     * this to `true`; subsequent events are ignored until the next activation.
     * Only used for line/circle modes (polygon uses the native draw tool).
     */
    const interactionDoneRef = useRef(false);
    /**
     * True while a rabbit *line* is being drawn via the native polyline draw
     * tool. Used by the capture-phase `canvas.drawn` listener to know that the
     * resulting polyline must be converted into a buffered mask (and that the
     * canvas-wrapper must be prevented from creating a polyline shape).
     */
    const rabbitLineActiveRef = useRef(false);
    /**
     * Stable ref to the latest `handleActivate` function so it can be called
     * from the `ncp:select-label` event listener without a stale closure.
     */
    const handleActivateRef = useRef<(labelOverride?: any) => void>(() => {});

    useEffect(() => {
        if (!activeControl || activeControl !== ActiveControl.RABBIT) {
            interactionDoneRef.current = false;
        }
        if (activeControl === ActiveControl.RABBIT || activeControl === ActiveControl.DRAW_POLYGON) {
            // Annotation started – force the popover open so the user can see
            // which label is currently being annotated (it will be highlighted).
            //setPopoverOpen(false);
        } else if (activeControl === ActiveControl.CURSOR) {
            // Back to idle – clear the highlight and the selected class so the
            // rabbit control becomes visible again (it hides while a class is set).
            setShortcutHighlightedLabelID(null);
            setSelectedLabelID(null);
            // Cancelled line draw (e.g. Escape) leaves the flag set – clear it.
            rabbitLineActiveRef.current = false;
        }
    }, [activeControl, setSelectedLabelID]);

    // ── Derived values ───────────────────────────────────────────────────────
    /**
     * isActive is true only when the rabbit tool is running an interact()
     * session (i.e. line or circle mode).  Polygon mode dispatches
     * DRAW_POLYGON and is handled entirely by the canvas-wrapper.
     */
    const isActive = activeControl === ActiveControl.RABBIT;
    const selectedLabel = labels.find((l: any) => l.id === selectedLabelID) ?? null;
    const labelMode: LabelMode = selectedLabel ? getLabelMode(selectedLabel.name, labels) : 'circle';
    const requiredPoints = getRequiredPointCount(labelMode);

    // Labels shown in the list/dropdown (exclude _geom and tag-type labels)
    const annotationLabels = labels.filter(
        (l: any) => l.name !== '_geom' && l.type !== ObjectType.TAG,
    );

    // ── ncp:select-label event listener ─────────────────────────────────────
    // Fired by labels-list.tsx when Ctrl+N is pressed in NCP mode while idle.
    // Opens the popover with the corresponding label highlighted AND immediately
    // starts the annotation (canvas waits for the user's click/draw).
    useEffect(() => {
        const handler = (e: Event): void => {
            const { label: lbl } = (e as CustomEvent).detail;
            if (!lbl) return;
            // Only handle annotation labels (skip _geom, tag-only labels)
            const isAnnotationLabel = annotationLabels.some((l: any) => l.id === lbl.id);
            if (!isAnnotationLabel) return;
            setSelectedLabelID(lbl.id as number);
            setShortcutHighlightedLabelID(lbl.id as number);
            // Start the annotation immediately so the canvas waits for input
            handleActivateRef.current(lbl);
        };
        window.addEventListener('ncp:select-label', handler);
        return (): void => window.removeEventListener('ncp:select-label', handler);
    }, [annotationLabels]);

    // ── ncp:open-rabbit event listener ───────────────────────────────────────
    // Fired by the NCP sidebar when the draw-mode shortcut (N) is pressed while
    // idle. Opens the class-list popover so the user can pick a label.
    useEffect(() => {
        const handler = (): void => setPopoverOpen(true);
        window.addEventListener('ncp:open-rabbit', handler);
        return (): void => window.removeEventListener('ncp:open-rabbit', handler);
    }, []);

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
                setSelectedLabelID(null)
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

    // ── Line draw → buffered mask (polyline draw path) ───────────────────────
    //
    // Line mode draws a native 2-point polyline so the user sees the line being
    // drawn as soon as the first point is set. We intercept `canvas.drawn` in
    // the CAPTURE phase (before the canvas-wrapper's bubble-phase listener that
    // would create a polyline shape), call stopImmediatePropagation, and create
    // a buffered MASK from the two points instead.
    useEffect(() => {
        if (!canvasInstance) return (): void => {};

        const handleDrawn = (e: Event): void => {
            if (!rabbitLineActiveRef.current) return;
            const { state } = (e as CustomEvent).detail ?? {};
            if (!state || state.shapeType !== ShapeType.POLYLINE) return;

            // Prevent the canvas-wrapper from turning this into a polyline shape.
            e.stopImmediatePropagation();
            rabbitLineActiveRef.current = false;

            const flat: number[] = state.points ?? [];
            const points: [number, number][] = [];
            for (let i = 0; i + 1 < flat.length; i += 2) {
                points.push([flat[i], flat[i + 1]]);
            }

            if (selectedLabel && points.length >= 2) {
                const maskPoints = buildMaskPoints('line', [points[0], points[points.length - 1]]);
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

            setSelectedLabelID(null);
            canvasInstance.draw({ enabled: false });
            dispatch(updateActiveControlAction(ActiveControl.CURSOR));
        };

        canvasInstance.html().addEventListener('canvas.drawn', handleDrawn, { capture: true });
        return (): void => {
            canvasInstance.html().removeEventListener('canvas.drawn', handleDrawn, { capture: true });
        };
    }, [canvasInstance, selectedLabel, frame, curZOrder, dispatch, setSelectedLabelID]);

    // ── Handlers ─────────────────────────────────────────────────────────────
    /**
     * Starts the annotation.
     *
     * - Polygon mode: delegates to `canvasInstance.draw()` with ShapeType.POLYGON
     *   so the user sees connecting lines between points (same as the standard
     *   polygon tool).  The canvas-wrapper handles `canvas.drawn` and creates
     *   a POLYGON annotation automatically.
     *
     * - Line mode: delegates to `canvasInstance.draw()` with ShapeType.POLYLINE
     *   (numberOfPoints: 2) so the line is drawn as soon as the first point is
     *   set; the capture-phase `canvas.drawn` listener converts the 2 points
     *   into a buffered MASK.
     *
     * - Circle mode: uses `canvasInstance.interact()` to collect a single point
     *   and then creates a circular MASK annotation.
     *
     * `labelOverride` — when provided (list mode), this label is used
     * immediately and `selectedLabelID` is updated in parallel.
     */
    const handleActivate = useCallback((labelOverride?: any): void => {
        const labelToUse = labelOverride ?? selectedLabel;
        if (!labelToUse) return;
        if (labelToUse.name) {
            message.info(`Label "${labelToUse.name}" selected`);
        }
        interactionDoneRef.current = false; // reset for new interaction
        setShortcutHighlightedLabelID(null); // clear shortcut highlight
        if (labelOverride && labelOverride.id !== selectedLabelID) {
            setSelectedLabelID(labelOverride.id as number);
        }
        const mode = getLabelMode(labelToUse.name, labels);
        rabbitLineActiveRef.current = false;
        canvasInstance.cancel();
        // Close the popover once a class is selected so it does not cover the
        // canvas while drawing. It reopens on the next N press / icon click.
        setPopoverOpen(false);

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
        } else if (mode === 'line') {
            // ── Line: use the native polyline draw path so the line is drawn
            // (rubber-band preview) as soon as the first point is set. It
            // auto-finishes at 2 points; the capture-phase `canvas.drawn`
            // listener then converts those 2 points into a buffered mask.
            rabbitLineActiveRef.current = true;
            dispatch(rememberObject({
                activeObjectType: ObjectType.SHAPE,
                activeShapeType: ShapeType.POLYLINE,
                activeLabelID: labelToUse.id,
            }));
            canvasInstance.draw({
                enabled: true,
                shapeType: ShapeType.POLYLINE,
                numberOfPoints: 2,
                crosshair: true,
            });
            dispatch(updateActiveControlAction(ActiveControl.DRAW_POLYLINE));
        } else {
            // ── Circle: use interact() to collect a single point ───────────
            canvasInstance.interact({
                enabled: true,
                command: 'draw_points',
                settings: { crosshair: true },
            });
            dispatch(updateActiveControlAction(ActiveControl.RABBIT));
        }
    }, [canvasInstance, dispatch, selectedLabel, selectedLabelID, labels]);

    // Keep the ref always pointing to the latest handleActivate closure so the
    // ncp:select-label event listener can call it without a stale closure.
    // This effect runs after every render (no dep array) to stay in sync.
    useEffect(() => {
        handleActivateRef.current = handleActivate;
    });

    const handleDeactivate = useCallback((): void => {
        canvasInstance.interact({ enabled: false });
        dispatch(updateActiveControlAction(ActiveControl.CURSOR));
    }, [canvasInstance, dispatch]);

    const handlePopoverOpenChange = useCallback((visible: boolean): void => {
        // Fully controlled: mirror antd's requested visibility so clicking the
        // icon (or outside) opens/closes the popover, even after we forced it
        // closed when a class was selected.
        setPopoverOpen(visible);
        if (!visible) {
            setShortcutHighlightedLabelID(null);
        }
    }, []);

    // ── Popover content ───────────────────────────────────────────────────────
    const listModeContent = (
        <div className='cvat-rabbit-control-popover-content'>
            <Row justify='start' style={{ marginBottom: 6 }}>
                <Col>
                    <Text className='cvat-text-color' strong>Classes</Text>
                </Col>
            </Row>
            {annotationLabels.map((label: any) => {
                const mode = getLabelMode(label.name, labels);
                // Always highlight the currently selected label so the user knows
                // which class is active.  Also highlight a shortcut-selected label
                // while waiting for the first canvas click.
                const isHighlighted = label.id === selectedLabelID || label.id === shortcutHighlightedLabelID;
                return (
                    <Row key={label.id} style={{ marginTop: 2 }}>
                        <Col span={24}>
                            <Button
                                block
                                type={isHighlighted ? 'primary' : 'default'}
                                ghost={isHighlighted}
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


    return (
        <CustomPopover
            open={popoverOpen}
            onOpenChange={handlePopoverOpenChange}
            overlayClassName='cvat-rabbit-control-popover'
            placement='right'
            content={listModeContent}
        >
            <CVATTooltip title='Rabbit tool' placement='right'>
                <Icon
                    component={RabbitSVGIcon}
                    className={
                        isActive
                            ? 'cvat-rabbit-control cvat-active-canvas-control'
                            : 'cvat-rabbit-control'
                    }
                    onClick={isActive ? () => handleDeactivate() : () => handleActivate()}
                />
            </CVATTooltip>
        </CustomPopover>
    );
}

Object.assign(RabbitControl, { displayName: 'RabbitControl' });
export default React.memo(RabbitControl);
