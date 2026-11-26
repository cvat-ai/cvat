// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React, {
    ReactNode, useCallback, useEffect, useMemo, useRef, useState,
} from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
    CombinedState, ActiveControl, ContextMenuType, NewIssueSource, Workspace,
} from 'reducers';
import {
    Canvas3d, CanvasMode, ViewType, IssueSprite, isIssueCuboid, isIssuePoint,
} from 'cvat-canvas3d-wrapper';
import { Issue, DimensionType } from 'cvat-core-wrapper';
import {
    commentIssueAsync, moveIssueAsync, reopenIssueAsync, resolveIssueAsync, reviewActions,
} from 'actions/review-actions';
import {
    activateObject, switchNavigationBlocked, updateActiveControl, updateCanvasContextMenu,
} from 'actions/annotation-actions';
import { ThunkDispatch, shallowEqual } from 'utils/redux';
import { useIsMounted } from 'utils/hooks';
import { clamp } from 'utils/math';
import { isReviewableCuboid } from 'utils/review/reviewable-cuboid';
import { showIssueGeometry, visibleFrameIssues } from 'utils/review/issue-visibility';
import CreateIssueDialog from './create-issue-dialog';
import HiddenIssueLabel, { getIssueLabelPosition } from './hidden-issue-label';
import IssueDialog from './issue-dialog';

const DRAFT_ISSUE_ID = 0;
const ISSUE_DRAG_THRESHOLD = 3;
const ISSUE_RESIZE_HANDLE_SIZE = 8;
const OVERLAY_GAP = 15;
const FALLBACK_INSET_TOP = 24;

interface IssuePane {
    view: ViewType;
    canvasRect: DOMRect;
    expanded: boolean;
}

interface DialogAnchor extends IssuePane {
    id: number;
    x: number;
    y: number;
}

interface Placement extends DialogAnchor {
    cuboid: boolean;
    corners: ([number, number] | null)[];
}

interface MarkerDrag {
    id: number;
    view: ViewType;
    pointerId: number;
    start: [number, number];
    origin: number[];
    position: number[];
    moved: boolean;
    corner: number | null;
    fromCanvas: boolean;
}

function getPaneSignature({ view, canvasRect, expanded }: IssuePane): string {
    const {
        left, top, width, height,
    } = canvasRect;
    return `${view}:${expanded}:${left}:${top}:${width}:${height}`;
}

function ViewOverlay({ canvasRect, children }: {
    canvasRect: DOMRect;
    children: (container: HTMLDivElement) => ReactNode;
}): JSX.Element {
    const [container, setContainer] = useState<HTMLDivElement | null>(null);
    return (
        <div
            ref={setContainer}
            className='cvat-canvas3d-issues-view'
            style={{
                left: canvasRect.left,
                top: canvasRect.top,
                width: canvasRect.width,
                height: canvasRect.height,
            }}
        >
            {container && children(container)}
        </div>
    );
}

function IssueOverlays({ canvas }: { canvas: Canvas3d }): JSX.Element {
    const dispatch = useDispatch<ThunkDispatch>();
    const {
        ready, activeControl, issues, newPosition, newSource,
        hidden, resolvedHidden, activeIssueId, highlightedIssueId, fetching,
        frame, job, navigationBlocked, objects, workspace,
    } = useSelector((state: CombinedState) => ({
        ready: state.annotation.canvas.ready,
        activeControl: state.annotation.canvas.activeControl,
        issues: state.review.frameIssues,
        newPosition: state.review.newIssue.position,
        newSource: state.review.newIssue.source,
        hidden: state.review.issuesHidden,
        resolvedHidden: state.review.issuesResolvedHidden,
        activeIssueId: state.review.activeIssueId,
        highlightedIssueId: state.review.highlightedIssueId,
        fetching: state.review.fetching.issueId !== null,
        frame: state.annotation.player.frame.number,
        job: state.annotation.job.instance,
        navigationBlocked: state.annotation.player.navigationBlocked,
        objects: state.annotation.annotations.states,
        workspace: state.annotation.workspace,
    }), shallowEqual);
    const [dialogContainer, setDialogContainer] = useState<HTMLDivElement | null>(null);
    const [{ placements, fallbackPane }, setLayout] = useState<{
        placements: Placement[];
        fallbackPane: IssuePane | null;
    }>({ placements: [], fallbackPane: null });
    const lastDialogPlacement = useRef<DialogAnchor | null>(null);
    const [creating, setCreating] = useState(false);
    const [draftView, setDraftView] = useState(ViewType.PERSPECTIVE);
    const [hoveredResolvedIssueId, setHoveredResolvedIssueId] = useState<number | null>(null);
    const [preview, setPreview] = useState<{ drag: MarkerDrag; position: number[] } | null>(null);
    const dragRef = useRef<MarkerDrag | null>(null);
    const completedCanvasPress = useRef<{ view: ViewType; issueId: number | null } | null>(null);
    const navigationOwner = useRef<MarkerDrag | null>(null);
    const suppressClick = useRef({ id: -1, until: 0 });
    const isMounted = useIsMounted();
    const visibleIssues = useMemo(() => visibleFrameIssues(issues, hidden, resolvedHidden), [
        issues, hidden, resolvedHidden,
    ]);
    const visibleIssuesById = useMemo(() => new Map(visibleIssues.map((issue) => [issue.id, issue])), [visibleIssues]);
    const activeIssue = visibleIssuesById.get(activeIssueId);
    const geometryHighlightId = highlightedIssueId ?? hoveredResolvedIssueId;
    const canDragIssues = !creating && !fetching && activeControl === ActiveControl.CURSOR;

    useEffect(() => {
        if (!newPosition) setDraftView(ViewType.PERSPECTIVE);
    }, [newPosition]);

    useEffect(() => {
        setHoveredResolvedIssueId(null);
    }, [frame, job]);

    useEffect(() => {
        const regions = ready ? visibleIssues.filter((issue) => (
            isIssueCuboid(issue.position) && showIssueGeometry(issue, activeIssueId, geometryHighlightId)
        ))
            .map((issue) => ({
                id: issue.id,
                position: preview?.drag.id === issue.id ? preview.position : issue.position,
                highlighted: issue.id === highlightedIssueId || preview?.drag.id === issue.id,
            })) : [];
        if (ready && isIssueCuboid(newPosition)) {
            regions.push({
                id: DRAFT_ISSUE_ID,
                position: preview?.drag.id === DRAFT_ISSUE_ID ? preview.position : newPosition,
                highlighted: false,
            });
        }
        canvas.setupIssueCuboids(regions, isIssueCuboid(newPosition) ? DRAFT_ISSUE_ID : activeIssueId);
    }, [
        canvas, ready, visibleIssues, highlightedIssueId, geometryHighlightId, newPosition, preview, activeIssueId,
    ]);

    useEffect(() => () => canvas.setupIssueCuboids([]), [canvas]);
    useEffect(() => () => canvas.setupIssueSprites([]), [canvas]);

    const beginDrag = (
        event: React.PointerEvent<HTMLElement> | PointerEvent, id: number, view: ViewType, corner: number | null = null,
    ): void => {
        if (event.button !== 0 || view === ViewType.PERSPECTIVE || !ready || creating || fetching ||
            activeControl !== ActiveControl.CURSOR || navigationBlocked || dragRef.current) return;
        const issue = visibleIssuesById.get(id);
        const origin = id === DRAFT_ISSUE_ID ? newPosition : issue?.position;
        if (!isIssuePoint(origin) && !isIssueCuboid(origin)) return;
        event.preventDefault();
        event.stopPropagation();
        const drag: MarkerDrag = {
            id,
            view,
            pointerId: event.pointerId,
            start: [event.clientX, event.clientY],
            origin: [...origin],
            position: [...origin],
            moved: false,
            corner,
            fromCanvas: event.currentTarget === canvas.html()[view],
        };
        dragRef.current = drag;
        navigationOwner.current = drag;
        dispatch(switchNavigationBlocked(true));
        setPreview({ drag, position: drag.position });
    };

    useEffect(() => {
        if (!ready) return undefined;
        const releaseNavigation = (drag: MarkerDrag): void => {
            if (navigationOwner.current === drag) {
                navigationOwner.current = null;
                dispatch(switchNavigationBlocked(false));
            }
        };
        const finishDrag = async (cancel: boolean): Promise<void> => {
            const drag = dragRef.current;
            if (!drag) return;
            dragRef.current = null;
            if (drag.moved && drag.corner === null && !drag.fromCanvas) {
                suppressClick.current = { id: drag.id, until: Date.now() + 250 };
            }
            try {
                if (!cancel && drag.moved && drag.position.some((value, index) => value !== drag.origin[index])) {
                    if (drag.id !== DRAFT_ISSUE_ID) await dispatch(moveIssueAsync(drag.id, drag.position));
                    else dispatch(reviewActions.moveDraftIssue(drag.position));
                }
            } finally {
                if (isMounted()) setPreview((current) => (current?.drag === drag ? null : current));
                releaseNavigation(drag);
            }
        };
        const move = (event: PointerEvent): void => {
            const drag = dragRef.current;
            if (!drag || event.pointerId !== drag.pointerId) return;
            if (!drag.moved &&
                Math.hypot(event.clientX - drag.start[0], event.clientY - drag.start[1]) < ISSUE_DRAG_THRESHOLD) return;
            event.preventDefault();
            const rect = canvas.html()[drag.view].getBoundingClientRect();
            const destination: [number, number] = [
                clamp(event.clientX, rect.left, rect.right),
                clamp(event.clientY, rect.top, rect.bottom),
            ];
            const next = drag.corner === null ? canvas.movePosition(drag.origin, drag.view, drag.start, destination) :
                canvas.resizeIssueCuboid(drag.origin, drag.corner, drag.view, drag.start, destination);
            if (next) {
                drag.moved = true;
                drag.position = next;
                setPreview({ drag, position: next });
            }
        };
        const up = (event: PointerEvent): void => {
            const drag = dragRef.current;
            if (!drag || event.pointerId !== drag.pointerId) return;
            if (drag.fromCanvas && event.target === canvas.html()[drag.view]) {
                const click = !drag.moved &&
                    Math.hypot(event.clientX - drag.start[0], event.clientY - drag.start[1]) < ISSUE_DRAG_THRESHOLD;
                completedCanvasPress.current = { view: drag.view, issueId: click ? drag.id : null };
            }
            finishDrag(false);
        };
        const cancel = (): void => { finishDrag(true); };
        const onKeyDown = (event: KeyboardEvent): void => {
            if (event.key === 'Escape' && dragRef.current) {
                event.preventDefault();
                event.stopPropagation();
                cancel();
            }
        };
        window.addEventListener('pointermove', move, { passive: false });
        window.addEventListener('pointerup', up);
        window.addEventListener('pointercancel', cancel);
        window.addEventListener('blur', cancel);
        // Cancel the drag before workspace shortcuts can consume Escape.
        window.addEventListener('keydown', onKeyDown, true);
        return () => {
            window.removeEventListener('pointermove', move);
            window.removeEventListener('pointerup', up);
            window.removeEventListener('pointercancel', cancel);
            window.removeEventListener('blur', cancel);
            window.removeEventListener('keydown', onKeyDown, true);
            dragRef.current = null;
            completedCanvasPress.current = null;
            setPreview(null);
            if (navigationOwner.current) releaseNavigation(navigationOwner.current);
        };
    }, [canvas, ready, frame, job]);

    const startDraft = useCallback((view: ViewType, position: number[]): void => {
        setDraftView(view);
        dispatch(updateActiveControl(ActiveControl.CURSOR, true));
        dispatch(reviewActions.startIssue(
            position,
            NewIssueSource.ISSUE_TOOL,
            canvas.getReviewView(),
            DimensionType.DIMENSION_3D,
        ));
    }, [canvas, dispatch]);

    useEffect(() => {
        const { perspective } = canvas.html();
        const drawn = (event: CustomEvent<{ position: number[] }>): void => {
            dispatch(activateObject(null, null, null));
            startDraft(ViewType.PERSPECTIVE, event.detail.position);
            canvas.focusPosition(event.detail.position);
        };
        perspective.addEventListener('canvas.issueregiondrawn', drawn as EventListener);
        return () => perspective.removeEventListener('canvas.issueregiondrawn', drawn as EventListener);
    }, [canvas, dispatch, startDraft]);

    const openIssue = useCallback((issue: Issue): void => {
        if (suppressClick.current.id === issue.id && Date.now() < suppressClick.current.until) return;
        if (Object.values(ViewType).some((view) => !canvas.projectPosition(issue.position, view))) {
            canvas.focusPosition(issue.position);
        }
        dispatch(reviewActions.selectIssue(issue.id));
    }, [canvas, dispatch]);

    useEffect(() => {
        if (!ready) return undefined;
        const views = canvas.html();
        let sourceView: ViewType | null = null;
        let start: [number, number] | null = null;
        let dragged = false;
        const onMouseDown = (view: ViewType, event: MouseEvent): void => {
            sourceView = view;
            start = event.button === 0 ? [event.clientX, event.clientY] : null;
            dragged = false;
        };
        const onPointerMove = (event: MouseEvent): void => {
            if (start && event.buttons === 1 && Math.hypot(event.clientX - start[0], event.clientY - start[1]) > 5) {
                dragged = true;
            }
        };
        const onClick = (view: ViewType, event: MouseEvent): void => {
            const origin = start;
            start = null;
            if (canvas.mode() === CanvasMode.DRAW || activeControl !== ActiveControl.OPEN_ISSUE ||
                sourceView !== view || !origin || dragged ||
                Math.hypot(event.clientX - origin[0], event.clientY - origin[1]) > 5) return;
            const pick = canvas.pick(event.clientX, event.clientY, view);
            if (pick) {
                // Place on the first click before the canvas handles annotation selection.
                event.preventDefault();
                event.stopImmediatePropagation();
                canvas.selectRegion(false);
                startDraft(view, pick.position);
            }
        };
        const onDoubleClick = (event: MouseEvent): void => {
            if (canvas.mode() !== CanvasMode.DRAW &&
                (activeControl === ActiveControl.OPEN_ISSUE || isIssuePoint(newPosition))) {
                // A second click must not fit the scene after the first one opens the point form.
                event.preventDefault();
                event.stopImmediatePropagation();
            }
        };
        const onContextMenu = (view: ViewType, event: MouseEvent): void => {
            if (workspace !== Workspace.REVIEW) return;
            event.preventDefault();
            event.stopImmediatePropagation();
            if (activeControl !== ActiveControl.CURSOR || navigationBlocked) return;
            const pick = canvas.pick(event.clientX, event.clientY, view);
            const object = objects.find((candidate) => (
                candidate.clientID === pick?.clientID && isReviewableCuboid(candidate)
            ));
            dispatch(activateObject(object?.clientID ?? null, null, null));
            setDraftView(view);
            dispatch(updateCanvasContextMenu(
                !!object, event.clientX, event.clientY, null, ContextMenuType.CANVAS_SHAPE,
            ));
        };
        const listeners = Object.values(ViewType).map((view) => {
            const down = (event: MouseEvent): void => onMouseDown(view, event);
            const click = (event: MouseEvent): void => onClick(view, event);
            const contextMenu = (event: MouseEvent): void => onContextMenu(view, event);
            const regionDown = (event: PointerEvent): void => {
                completedCanvasPress.current = null;
                if (workspace !== Workspace.REVIEW || view === ViewType.PERSPECTIVE || event.button !== 0 ||
                    activeControl !== ActiveControl.CURSOR || creating || fetching || navigationBlocked) return;
                const id = canvas.pickIssueCuboid(event.clientX, event.clientY, view);
                if (id === null) return;
                event.stopImmediatePropagation();
                beginDrag(event, id, view);
            };
            const onRegionClick = (event: MouseEvent): void => {
                if (activeControl !== ActiveControl.CURSOR) return;
                const press = completedCanvasPress.current;
                completedCanvasPress.current = null;
                if (press?.view === view) {
                    event.stopImmediatePropagation();
                    const issue = press.issueId === null ? undefined : visibleIssuesById.get(press.issueId);
                    if (issue && !newPosition) openIssue(issue);
                    return;
                }
                if (dragged) return;
                if (isIssueCuboid(newPosition)) {
                    event.stopImmediatePropagation();
                    return;
                }
                if (isIssueCuboid(activeIssue?.position) &&
                    canvas.pickIssueCuboid(event.clientX, event.clientY, view) === null) {
                    dispatch(reviewActions.selectIssue(null));
                }
            };
            views[view].addEventListener('mousedown', down, true);
            views[view].addEventListener('click', click, true);
            views[view].addEventListener('dblclick', onDoubleClick, true);
            views[view].addEventListener('pointerdown', regionDown, true);
            views[view].addEventListener('click', onRegionClick, true);
            views[view].addEventListener('contextmenu', contextMenu, true);
            return () => {
                views[view].removeEventListener('mousedown', down, true);
                views[view].removeEventListener('click', click, true);
                views[view].removeEventListener('dblclick', onDoubleClick, true);
                views[view].removeEventListener('pointerdown', regionDown, true);
                views[view].removeEventListener('click', onRegionClick, true);
                views[view].removeEventListener('contextmenu', contextMenu, true);
            };
        });
        window.addEventListener('mousemove', onPointerMove);
        return () => {
            listeners.forEach((remove) => remove());
            window.removeEventListener('mousemove', onPointerMove);
        };
    }, [
        canvas, ready, activeControl, objects, workspace, navigationBlocked,
        visibleIssuesById, newPosition, creating, fetching, activeIssue, startDraft, openIssue,
    ]);

    useEffect(() => {
        if (!ready) {
            setLayout({ placements: [], fallbackPane: null });
            canvas.setupIssueSprites([]);
            return undefined;
        }
        const pins = [
            ...visibleIssues.map((issue) => ({
                id: issue.id,
                issue,
                position: preview?.drag.id === issue.id ? preview.position : issue.position,
            })),
            ...(newPosition ? [{
                id: DRAFT_ISSUE_ID,
                issue: null,
                position: preview?.drag.id === DRAFT_ISSUE_ID ? preview.position : newPosition,
            }] : []),
        ].map((pin) => ({ ...pin, cuboid: isIssueCuboid(pin.position) }));
        let animationFrame: number;
        let previous: string | null = null;
        let previousSprites: string | null = null;
        const updatePositions = (): void => {
            const next: Placement[] = [];
            const sprites: IssueSprite[] = [];
            const views = canvas.html();
            const expandedItem = views.perspective.closest('.cvat-canvas-grid-root')
                ?.querySelector('.cvat-canvas-grid-fullscreen-item');
            let nextFallbackPane: IssuePane | null = null;
            Object.values(ViewType).forEach((view) => {
                // Covered panes still have non-zero bounds when another pane is expanded.
                if (expandedItem && !expandedItem.contains(views[view])) return;
                const canvasRect = views[view].getBoundingClientRect();
                if (!canvasRect.width || !canvasRect.height) return;
                const pane: IssuePane = { view, canvasRect, expanded: !!expandedItem };
                if (view === ViewType.PERSPECTIVE || expandedItem) nextFallbackPane = pane;
                pins.forEach((pin) => {
                    const point = canvas.projectPosition(pin.position, view);
                    if (point) {
                        const isActive = pin.id === DRAFT_ISSUE_ID ?
                            newSource === NewIssueSource.ISSUE_TOOL : pin.id === activeIssueId;
                        const canResize = canDragIssues && pin.cuboid && isActive && view !== ViewType.PERSPECTIVE;
                        const corners = canResize ? canvas.projectIssueCuboid(pin.position, view).map(
                            (corner, index, projected) => (
                                corner && !projected.slice(0, index).some((other) => (
                                    other && Math.hypot(other[0] - corner[0], other[1] - corner[1]) < 2
                                )) ? corner : null
                            ),
                        ) : [];
                        next.push({
                            ...pane,
                            id: pin.id,
                            x: Math.round((canvasRect.left + point[0]) * 100) / 100,
                            y: Math.round((canvasRect.top + point[1]) * 100) / 100,
                            cuboid: pin.cuboid,
                            corners,
                        });
                        corners.forEach((corner, index) => {
                            if (!corner) return;
                            sprites.push({
                                id: pin.id,
                                view,
                                position: pin.position,
                                width: ISSUE_RESIZE_HANDLE_SIZE,
                                height: ISSUE_RESIZE_HANDLE_SIZE,
                                offset: [corner[0] - point[0], corner[1] - point[1]],
                                highlighted: false,
                                corner: index,
                            });
                        });
                        const { issue } = pin;
                        const highlighted = highlightedIssueId === pin.id || preview?.drag.id === pin.id;
                        if (isIssuePoint(pin.position) &&
                            (!issue || showIssueGeometry(issue, activeIssueId, geometryHighlightId))) {
                            sprites.push({
                                id: pin.id,
                                view,
                                position: pin.position,
                                highlighted,
                                width: 12,
                                height: 12,
                                offset: [0, 0],
                            });
                        }
                        const label = document.getElementById(`cvat-hidden-issue-label-${pin.id}-${view}`);
                        if (issue && label) {
                            const { width, height } = label.getBoundingClientRect();
                            const style = window.getComputedStyle(label);
                            const { left, top } = getIssueLabelPosition(
                                point[1] + OVERLAY_GAP, point[0] + OVERLAY_GAP, canvasRect, { width, height },
                            );
                            sprites.push({
                                id: pin.id,
                                view,
                                position: pin.position,
                                highlighted,
                                width,
                                height,
                                offset: [left - point[0], top - point[1]],
                                label: {
                                    text: issue.comments[0]?.message || '',
                                    resolved: issue.resolved,
                                    font: `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`,
                                    order: Array.from(label.parentElement.children).indexOf(label),
                                },
                            });
                        }
                    }
                });
            });
            const spriteSignature = JSON.stringify([window.devicePixelRatio, sprites]);
            if (spriteSignature !== previousSprites) {
                previousSprites = spriteSignature;
                canvas.setupIssueSprites(sprites);
            }
            const placementSignature = next.map((placement) => {
                const {
                    id, x, y, cuboid, corners,
                } = placement;
                return [id, x, y, cuboid, getPaneSignature(placement), JSON.stringify(corners)].join(':');
            }).join('|');
            const fallbackSignature = nextFallbackPane ? getPaneSignature(nextFallbackPane) : '';
            const signature = `${placementSignature}|${fallbackSignature}`;
            if (signature !== previous) {
                previous = signature;
                setLayout({ placements: next, fallbackPane: nextFallbackPane });
            }
            animationFrame = requestAnimationFrame(updatePositions);
        };
        updatePositions();
        return () => cancelAnimationFrame(animationFrame);
    }, [
        canvas, ready, visibleIssues, newPosition, newSource, preview, highlightedIssueId, geometryHighlightId,
        activeIssueId, canDragIssues,
    ]);

    useEffect(() => {
        if (!ready || !activeIssue || activeControl !== ActiveControl.CURSOR) return;
        dispatch(activateObject(null, null, null));
    }, [activeIssue, activeControl, ready, dispatch]);

    const dialogId = newPosition ? DRAFT_ISSUE_ID : activeIssueId;
    const preferredView = newPosition ? draftView : ViewType.PERSPECTIVE;
    const activePlacement = placements.find(({ id, view, expanded }) => (
        id === dialogId && (view === preferredView || expanded)
    ));
    // Park saved discussions below the pane controls while their spatial anchor is off-screen.
    const visibleAnchor: DialogAnchor | null = activePlacement ?? (!newPosition && activeIssue && fallbackPane ? {
        ...fallbackPane,
        id: activeIssue.id,
        x: fallbackPane.canvasRect.left,
        y: fallbackPane.canvasRect.top + FALLBACK_INSET_TOP,
    } : null);
    useEffect(() => {
        if (visibleAnchor) lastDialogPlacement.current = visibleAnchor;
    }, [visibleAnchor]);
    const previousPlacement = lastDialogPlacement.current;
    const dialogPlacement = visibleAnchor || (previousPlacement?.id === dialogId ? previousPlacement : null);
    // The creation form can be taller or wider than a docked orthographic pane.
    // Allow it to extend over the grid while keeping its anchor in the clicked view.
    const draftBounds = newPosition && dialogPlacement && !dialogPlacement.expanded &&
        dialogPlacement.view !== ViewType.PERSPECTIVE ?
        canvas.html()[dialogPlacement.view].closest('.cvat-canvas-grid-root')?.getBoundingClientRect() : null;
    const dialogCoordinates: [number, number] | null = dialogPlacement && [
        dialogPlacement.x + OVERLAY_GAP, dialogPlacement.y + OVERLAY_GAP,
    ];
    const dialogPosition = dialogCoordinates && {
        container: dialogContainer,
        top: dialogCoordinates[1],
        left: dialogCoordinates[0],
        angle: 0,
        scale: 1,
        clientCoordinates: dialogCoordinates,
        canvasRect: draftBounds || dialogPlacement.canvasRect,
    };
    const showRegion = (issue: Issue, show: boolean): void => {
        if (issue.resolved) {
            setHoveredResolvedIssueId((current) => {
                if (show) return issue.id;
                return current === issue.id ? null : current;
            });
        }
    };

    return (
        <>
            <div className={`cvat-canvas3d-issues ${preview ? 'cvat-canvas3d-issues-dragging' : ''}`}>
                <div ref={setDialogContainer} hidden={!visibleAnchor} />
                {ready && Object.values(ViewType).map((view) => {
                    const viewPlacements = placements.filter((placement) => placement.view === view);
                    const canvasRect = viewPlacements[0]?.canvasRect;
                    if (!canvasRect) return null;
                    return (
                        <ViewOverlay key={view} canvasRect={canvasRect}>
                            {(container) => viewPlacements.map(({
                                id, x, y, expanded, cuboid, corners,
                            }) => {
                                const issue = visibleIssuesById.get(id);
                                const isDraft = id === DRAFT_ISSUE_ID;
                                if (!issue && !(isDraft && newPosition)) return null;
                                const draggable = view !== ViewType.PERSPECTIVE && canDragIssues &&
                                    (!isDraft || newSource === NewIssueSource.ISSUE_TOOL);
                                const clickable = draggable || (view === ViewType.PERSPECTIVE && !!issue &&
                                    activeControl === ActiveControl.CURSOR);
                                const highlighted = highlightedIssueId === id || preview?.drag.id === id;
                                const hasDialog = activeIssueId === id && (view === ViewType.PERSPECTIVE || expanded);
                                const resizeHandles = draggable && corners.length && (isDraft || activeIssueId === id);
                                const regionProps = {
                                    className: `cvat-canvas3d-issue-region ${highlighted ?
                                        'cvat-canvas3d-issue-highlighted' : ''}`,
                                    'data-issue-id': id,
                                    'data-view': view,
                                    style: {
                                        left: x - canvasRect.left,
                                        top: y - canvasRect.top,
                                        visibility: !issue ||
                                            showIssueGeometry(issue, activeIssueId, geometryHighlightId) ?
                                            'visible' as const : 'hidden' as const,
                                    },
                                };

                                return (
                                    <React.Fragment key={id}>
                                        {!cuboid && (clickable ? (
                                            <button
                                                {...regionProps}
                                                type='button'
                                                aria-label={draggable ?
                                                    `Move ${isDraft ? 'new issue' : `issue #${id}`} in ${view} view` :
                                                    `Open issue #${id}`}
                                                title={draggable ? 'Drag to reposition the issue. Press Escape to cancel.' :
                                                    undefined}
                                                onPointerDown={draggable ?
                                                    (event) => beginDrag(event, id, view) : undefined}
                                                onClick={() => { if (issue) openIssue(issue); }}
                                            />
                                        ) : <div {...regionProps} aria-hidden />)}
                                        {!!resizeHandles && corners.map((corner, index) => {
                                            if (!corner) return null;
                                            return (
                                                <button
                                                    key={index}
                                                    type='button'
                                                    className='cvat-canvas3d-issue-resize-handle'
                                                    data-issue-id={id}
                                                    data-view={view}
                                                    style={{ left: corner[0], top: corner[1] }}
                                                    aria-label={`Resize issue region in ${view} view`}
                                                    title='Drag to resize the issue region. Press Escape to cancel.'
                                                    onPointerDown={(event) => beginDrag(event, id, view, index)}
                                                />
                                            );
                                        })}
                                        {issue && !hasDialog && (
                                            <HiddenIssueLabel
                                                container={container}
                                                bounds={canvasRect}
                                                top={y - canvasRect.top + OVERLAY_GAP}
                                                left={x - canvasRect.left + OVERLAY_GAP}
                                                angle={0}
                                                scale={1}
                                                idSuffix={`-${view}`}
                                                issue={issue}
                                                resolved={issue.resolved}
                                                highlight={() => showRegion(issue, true)}
                                                blur={() => showRegion(issue, false)}
                                                onPointerDown={draggable ?
                                                    (event) => beginDrag(event, id, view) : undefined}
                                                onClick={() => openIssue(issue)}
                                            />
                                        )}
                                    </React.Fragment>
                                );
                            })}
                        </ViewOverlay>
                    );
                })}
            </div>
            {ready && dialogContainer && dialogPosition && (
                newPosition && newSource === NewIssueSource.ISSUE_TOOL ? (
                    <CreateIssueDialog
                        {...dialogPosition}
                        onFetchingChange={setCreating}
                    />
                ) : activeIssue && (
                    <IssueDialog
                        {...dialogPosition}
                        key={activeIssue.id}
                        issue={activeIssue}
                        resolved={activeIssue.resolved}
                        isFetching={fetching}
                        highlight={() => showRegion(activeIssue, true)}
                        blur={() => showRegion(activeIssue, false)}
                        collapse={() => dispatch(reviewActions.selectIssue(null))}
                        resolve={() => {
                            dispatch(resolveIssueAsync(activeIssue.id));
                            dispatch(reviewActions.selectIssue(null));
                        }}
                        reopen={() => dispatch(reopenIssueAsync(activeIssue.id))}
                        comment={(message) => dispatch(commentIssueAsync(activeIssue.id, message))}
                    />
                )
            )}
        </>
    );
}

export default function Review3D(): JSX.Element | null {
    const canvas = useSelector((state: CombinedState) => state.annotation.canvas.instance);
    return canvas instanceof Canvas3d ? <IssueOverlays canvas={canvas} /> : null;
}
