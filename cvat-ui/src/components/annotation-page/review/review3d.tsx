// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React, {
    ReactNode, useEffect, useRef, useState,
} from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
    CombinedState, ActiveControl, ContextMenuType, NewIssueSource, Workspace,
} from 'reducers';
import {
    Canvas3d, CanvasMode, ViewType, IssueSprite,
} from 'cvat-canvas3d-wrapper';
import {
    Issue, ObjectType, ShapeType, DimensionType,
} from 'cvat-core-wrapper';
import {
    commentIssueAsync, moveIssueAsync, reopenIssueAsync, resolveIssueAsync, reviewActions,
} from 'actions/review-actions';
import {
    activateObject, switchNavigationBlocked, updateActiveControl, updateCanvasContextMenu,
} from 'actions/annotation-actions';
import { ThunkDispatch, shallowEqual } from 'utils/redux';
import { useIsMounted } from 'utils/hooks';
import CreateIssueDialog from './create-issue-dialog';
import HiddenIssueLabel from './hidden-issue-label';
import IssueDialog from './issue-dialog';

interface Placement {
    id: number;
    view: ViewType;
    x: number;
    y: number;
    canvasRect: DOMRect;
    expanded: boolean;
    corners: ([number, number] | null)[];
}

interface MarkerDrag {
    id: number;
    issue: Issue | null;
    view: ViewType;
    pointerId: number;
    start: [number, number];
    origin: number[];
    position: number[];
    moved: boolean;
    corner: number | null;
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

export default function Review3D(): JSX.Element {
    const dispatch = useDispatch<ThunkDispatch>();
    const {
        canvas, ready, activeControl, issues, newPosition, newSource, newObjectClientID,
        hidden, resolvedHidden, activeIssueId, highlightedIssueId, fetching,
        frame, job, navigationBlocked, objects, workspace,
    } = useSelector((state: CombinedState) => ({
        canvas: state.annotation.canvas.instance as Canvas3d,
        ready: state.annotation.canvas.ready,
        activeControl: state.annotation.canvas.activeControl,
        issues: state.review.frameIssues as Issue[],
        newPosition: state.review.newIssue.position,
        newSource: state.review.newIssue.source,
        newObjectClientID: state.review.newIssue.objectClientID,
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
    const [placements, setPlacements] = useState<Placement[]>([]);
    const lastDialogPlacement = useRef<Placement | null>(null);
    const [creating, setCreating] = useState(false);
    const [draftView, setDraftView] = useState(ViewType.PERSPECTIVE);
    const [hoveredResolvedIssueId, setHoveredResolvedIssueId] = useState<number | null>(null);
    const [preview, setPreview] = useState<{ drag: MarkerDrag; position: number[] } | null>(null);
    const dragRef = useRef<MarkerDrag | null>(null);
    const navigationOwner = useRef<MarkerDrag | null>(null);
    const suppressClick = useRef({ id: -1, until: 0 });
    const isMounted = useIsMounted();

    useEffect(() => {
        if (!newPosition) setDraftView(ViewType.PERSPECTIVE);
    }, [newPosition]);

    useEffect(() => {
        setHoveredResolvedIssueId(null);
    }, [frame, job]);

    useEffect(() => {
        const regions: Record<number, { highlighted: boolean }> = {};
        if (ready && !hidden) {
            for (const issue of issues) {
                const highlighted = issue.id === highlightedIssueId;
                if (issue.objectID === null || (issue.resolved &&
                    (resolvedHidden || (!highlighted && issue.id !== hoveredResolvedIssueId)))) continue;
                const object = objects.find((candidate) => !candidate.isGroundTruth && !candidate.outside &&
                    !candidate.hidden && candidate.shapeType === ShapeType.CUBOID &&
                    candidate.serverID === issue.objectID && candidate.objectType === issue.objectType);
                if (object) {
                    regions[object.clientID] = { highlighted: highlighted || !!regions[object.clientID]?.highlighted };
                }
            }
        }
        if (ready && newPosition && newObjectClientID !== null) {
            regions[newObjectClientID] = regions[newObjectClientID] || { highlighted: false };
        }
        canvas.setupIssueRegions(regions);
    }, [
        canvas, ready, issues, objects, hidden, resolvedHidden, highlightedIssueId, hoveredResolvedIssueId,
        newPosition, newObjectClientID,
    ]);

    useEffect(() => () => canvas.setupIssueRegions({}), [canvas]);

    useEffect(() => {
        const regions = ready && !hidden ? issues.filter((issue) => issue.position.length === 16 &&
            (!issue.resolved || (!resolvedHidden &&
                (issue.id === highlightedIssueId || issue.id === hoveredResolvedIssueId))))
            .map((issue) => ({
                id: issue.id,
                position: preview?.drag.id === issue.id ? preview.position : issue.position,
                highlighted: issue.id === highlightedIssueId || preview?.drag.id === issue.id,
            })) : [];
        if (ready && newPosition?.length === 16) {
            regions.push({
                id: 0,
                position: preview?.drag.id === 0 ? preview.position : newPosition,
                highlighted: false,
            });
        }
        canvas.setupIssueCuboids(regions, newPosition?.length === 16 ? 0 : activeIssueId);
    }, [
        canvas, ready, issues, hidden, resolvedHidden, highlightedIssueId, hoveredResolvedIssueId,
        newPosition, preview, activeIssueId,
    ]);

    useEffect(() => () => canvas.setupIssueCuboids([]), [canvas]);
    useEffect(() => () => canvas.setupIssueSprites([]), [canvas]);

    const beginDrag = (
        event: React.PointerEvent<HTMLElement> | PointerEvent, id: number, view: ViewType, corner: number | null = null,
    ): void => {
        if (event.button !== 0 || view === ViewType.PERSPECTIVE || !ready || creating || fetching ||
            activeControl !== ActiveControl.CURSOR || navigationBlocked || dragRef.current) return;
        const issue = issues.find((item) => item.id === id) || null;
        const origin = id === 0 ? newPosition : issue?.position;
        if (!origin || ![3, 16].includes(origin.length)) return;
        event.preventDefault();
        event.stopPropagation();
        const drag: MarkerDrag = {
            id,
            issue,
            view,
            pointerId: event.pointerId,
            start: [event.clientX, event.clientY],
            origin: [...origin],
            position: [...origin],
            moved: false,
            corner,
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
            if (drag.moved) suppressClick.current = { id: drag.id, until: Date.now() + 250 };
            try {
                if (!cancel && drag.moved && drag.position.some((value, index) => value !== drag.origin[index])) {
                    if (drag.issue) await dispatch(moveIssueAsync(drag.issue, drag.position));
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
            if (!drag.moved && Math.hypot(event.clientX - drag.start[0], event.clientY - drag.start[1]) < 3) return;
            event.preventDefault();
            const rect = canvas.html()[drag.view].getBoundingClientRect();
            const destination: [number, number] = [
                Math.max(rect.left, Math.min(event.clientX, rect.right)),
                Math.max(rect.top, Math.min(event.clientY, rect.bottom)),
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
            if (event.pointerId === dragRef.current?.pointerId) finishDrag(false);
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
            setPreview(null);
            if (navigationOwner.current) releaseNavigation(navigationOwner.current);
        };
    }, [canvas, ready, frame, job]);

    useEffect(() => {
        const { perspective } = canvas.html();
        const drawn = (event: CustomEvent<{ position: number[] }>): void => {
            setDraftView(ViewType.PERSPECTIVE);
            dispatch(activateObject(null, null, null));
            dispatch(updateActiveControl(ActiveControl.CURSOR, true));
            dispatch(reviewActions.startIssue(
                event.detail.position,
                NewIssueSource.ISSUE_TOOL,
                null,
                canvas.getReviewView(),
                DimensionType.DIMENSION_3D,
            ));
            canvas.focusPosition(event.detail.position);
        };
        perspective.addEventListener('canvas.issueregiondrawn', drawn as EventListener);
        return () => perspective.removeEventListener('canvas.issueregiondrawn', drawn as EventListener);
    }, [canvas]);

    const openIssue = (issue: Issue): void => {
        if (suppressClick.current.id === issue.id && Date.now() < suppressClick.current.until) return;
        if (Object.values(ViewType).some((view) => !canvas.projectPosition(issue.position, view))) {
            canvas.focusPosition(issue.position);
        }
        dispatch(reviewActions.selectIssue(issue.id));
    };

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
                setDraftView(view);
                dispatch(updateActiveControl(ActiveControl.CURSOR, true));
                dispatch(reviewActions.startIssue(
                    pick.position,
                    NewIssueSource.ISSUE_TOOL,
                    null,
                    canvas.getReviewView(),
                    DimensionType.DIMENSION_3D,
                ));
            }
        };
        const onDoubleClick = (event: MouseEvent): void => {
            if (canvas.mode() !== CanvasMode.DRAW &&
                (activeControl === ActiveControl.OPEN_ISSUE || newPosition?.length === 3)) {
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
            const object = objects.find((candidate) => candidate.clientID === pick?.clientID &&
                !candidate.isGroundTruth && !candidate.outside && !candidate.hidden &&
                candidate.shapeType === ShapeType.CUBOID &&
                [ObjectType.SHAPE, ObjectType.TRACK].includes(candidate.objectType));
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
                if (workspace !== Workspace.REVIEW || view === ViewType.PERSPECTIVE || event.button !== 0 ||
                    activeControl !== ActiveControl.CURSOR || creating || fetching || navigationBlocked) return;
                const id = canvas.pickIssueCuboid(event.clientX, event.clientY, view);
                if (id === null) return;
                event.stopImmediatePropagation();
                if (id) dispatch(reviewActions.selectIssue(id));
                beginDrag(event, id, view);
            };
            const regionClick = (event: MouseEvent): void => {
                if (activeControl !== ActiveControl.CURSOR || dragged) return;
                if (newPosition?.length === 16) {
                    event.stopImmediatePropagation();
                    return;
                }
                const id = canvas.pickIssueCuboid(event.clientX, event.clientY, view);
                const issue = issues.find((item) => item.id === id);
                if (!issue) {
                    if (issues.find((item) => item.id === activeIssueId)?.position.length === 16) {
                        dispatch(reviewActions.selectIssue(null));
                    }
                    return;
                }
                event.stopImmediatePropagation();
                openIssue(issue);
            };
            views[view].addEventListener('mousedown', down, true);
            views[view].addEventListener('click', click, true);
            views[view].addEventListener('dblclick', onDoubleClick, true);
            views[view].addEventListener('pointerdown', regionDown, true);
            views[view].addEventListener('click', regionClick, true);
            views[view].addEventListener('contextmenu', contextMenu, true);
            return () => {
                views[view].removeEventListener('mousedown', down, true);
                views[view].removeEventListener('click', click, true);
                views[view].removeEventListener('dblclick', onDoubleClick, true);
                views[view].removeEventListener('pointerdown', regionDown, true);
                views[view].removeEventListener('click', regionClick, true);
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
        issues, newPosition, creating, fetching, activeIssueId,
    ]);

    useEffect(() => {
        if (!ready) {
            setPlacements([]);
            canvas.setupIssueSprites([]);
            return undefined;
        }
        const pins = [
            ...issues.map((issue) => ({
                id: issue.id,
                position: preview?.drag.id === issue.id ? preview.position : issue.position,
            })),
            ...(newPosition ? [{ id: 0, position: preview?.drag.id === 0 ? preview.position : newPosition }] : []),
        ];
        let animationFrame: number;
        let previous: string | null = null;
        const updatePositions = (): void => {
            const next: Placement[] = [];
            const sprites: IssueSprite[] = [];
            const views = canvas.html();
            const expandedItem = views.perspective.closest('.cvat-canvas-grid-root')
                ?.querySelector('.cvat-canvas-grid-fullscreen-item');
            Object.values(ViewType).forEach((view) => {
                // Covered panes still have non-zero bounds when another pane is expanded.
                if (expandedItem && !expandedItem.contains(views[view])) return;
                const canvasRect = views[view].getBoundingClientRect();
                if (!canvasRect.width || !canvasRect.height) return;
                pins.forEach((pin) => {
                    const point = canvas.projectPosition(pin.position, view);
                    if (point) {
                        next.push({
                            id: pin.id,
                            view,
                            x: Math.round((canvasRect.left + point[0]) * 100) / 100,
                            y: Math.round((canvasRect.top + point[1]) * 100) / 100,
                            canvasRect,
                            expanded: !!expandedItem,
                            corners: pin.position.length === 16 ? canvas.projectIssueCuboid(pin.position, view) : [],
                        });
                        const issue = issues.find((item) => item.id === pin.id);
                        if (issue && (hidden || (resolvedHidden && issue.resolved))) return;
                        if (!issue && !(pin.id === 0 && newPosition)) return;
                        const highlighted = highlightedIssueId === pin.id || preview?.drag.id === pin.id;
                        if (pin.position.length === 3 &&
                            (!issue?.resolved || highlighted || hoveredResolvedIssueId === pin.id)) {
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
                            sprites.push({
                                id: pin.id,
                                view,
                                position: pin.position,
                                highlighted,
                                width,
                                height,
                                offset: [
                                    Math.max(8, Math.min(point[0] + 15, canvasRect.width - width - 8)) - point[0],
                                    Math.max(8, Math.min(point[1] + 15, canvasRect.height - height - 8)) - point[1],
                                ],
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
            canvas.setupIssueSprites(sprites);
            const signature = next.map(({
                id, view, x, y, canvasRect, expanded, corners,
            }) => [
                id, view, x, y, expanded,
                canvasRect.left, canvasRect.top, canvasRect.width, canvasRect.height,
                JSON.stringify(corners),
            ].join(':')).join('|');
            if (signature !== previous) {
                previous = signature;
                setPlacements(next);
            }
            animationFrame = requestAnimationFrame(updatePositions);
        };
        updatePositions();
        return () => cancelAnimationFrame(animationFrame);
    }, [
        canvas, ready, issues, newPosition, preview, hidden, resolvedHidden, highlightedIssueId, hoveredResolvedIssueId,
    ]);

    const visibleIssues = hidden ? [] : issues.filter((issue) => !resolvedHidden || !issue.resolved);
    const activeIssue = visibleIssues.find((issue) => issue.id === activeIssueId);
    useEffect(() => {
        if (!ready || !activeIssue || activeControl !== ActiveControl.CURSOR) return;
        const object = activeIssue.objectID === null ? null : objects.find((candidate) => (
            !candidate.isGroundTruth && !candidate.outside && !candidate.hidden &&
            candidate.shapeType === ShapeType.CUBOID && candidate.serverID === activeIssue.objectID &&
            candidate.objectType === activeIssue.objectType
        ));
        // Reuse selection so the linked cuboid is highlighted in every 3D view.
        dispatch(activateObject(object?.clientID ?? null, null, null));
    }, [activeIssue, activeControl, objects, ready]);

    const dialogId = newPosition ? 0 : activeIssueId;
    const preferredView = newPosition ? draftView : ViewType.PERSPECTIVE;
    const activePlacement = placements.find(({ id, view, expanded }) => (
        id === dialogId && (view === preferredView || expanded)
    ));
    useEffect(() => {
        if (activePlacement) lastDialogPlacement.current = activePlacement;
    }, [activePlacement]);
    const dialogPlacement = activePlacement || lastDialogPlacement.current;
    // The creation form can be taller or wider than a docked orthographic pane.
    // Allow it to extend over the grid while keeping its anchor in the clicked view.
    const draftBounds = newPosition && dialogPlacement && !dialogPlacement.expanded &&
        dialogPlacement.view !== ViewType.PERSPECTIVE ?
        canvas.html()[dialogPlacement.view].closest('.cvat-canvas-grid-root')?.getBoundingClientRect() : null;
    const dialogPosition = dialogPlacement && {
        container: dialogContainer,
        top: dialogPlacement.y + 15,
        left: dialogPlacement.x + 15,
        angle: 0,
        scale: 1,
        clientCoordinates: [dialogPlacement.x + 15, dialogPlacement.y + 15] as [number, number],
        canvasRect: draftBounds || dialogPlacement.canvasRect,
    };
    const showRegion = (issue: Issue, show: boolean): void => {
        if (issue.resolved) {
            setHoveredResolvedIssueId((current) => {
                if (show) return issue.id;
                return current === issue.id ? null : current;
            });
        }
        window.document.querySelectorAll<HTMLElement>(
            `.cvat-canvas3d-issue-region[data-issue-id="${issue.id}"]`,
        ).forEach((element) => {
            element.style.visibility = show || !issue.resolved ? 'visible' : 'hidden';
        });
    };

    return (
        <>
            <div className={`cvat-canvas3d-issues ${preview ? 'cvat-canvas3d-issues-dragging' : ''}`}>
                <div ref={setDialogContainer} hidden={!activePlacement} />
                {ready && Object.values(ViewType).map((view) => {
                    const viewPlacements = placements.filter((placement) => placement.view === view);
                    const canvasRect = viewPlacements[0]?.canvasRect;
                    if (!canvasRect) return null;
                    return (
                        <ViewOverlay key={view} canvasRect={canvasRect}>
                            {(container) => viewPlacements.map(({
                                id, x, y, expanded, corners,
                            }) => {
                                const issue = visibleIssues.find((item) => item.id === id);
                                if (!issue && !(id === 0 && newPosition)) return null;
                                const draggable = view !== ViewType.PERSPECTIVE && !creating && !fetching &&
                                    activeControl === ActiveControl.CURSOR &&
                                    (id !== 0 || newSource === NewIssueSource.ISSUE_TOOL);
                                const clickable = draggable || (view === ViewType.PERSPECTIVE && !!issue &&
                                    activeControl === ActiveControl.CURSOR);
                                const highlighted = highlightedIssueId === id || preview?.drag.id === id;
                                const hasDialog = activeIssueId === id && (view === ViewType.PERSPECTIVE || expanded);
                                const resizeHandles = draggable && corners.length && (id === 0 || activeIssueId === id);
                                const regionProps = {
                                    className: `cvat-canvas3d-issue-region ${highlighted ?
                                        'cvat-canvas3d-issue-highlighted' : ''}`,
                                    'data-issue-id': id,
                                    'data-view': view,
                                    style: {
                                        left: x - canvasRect.left,
                                        top: y - canvasRect.top,
                                        visibility: issue?.resolved && !highlighted ?
                                            'hidden' as const : 'visible' as const,
                                    },
                                };

                                return (
                                    <React.Fragment key={id}>
                                        {!corners.length && (clickable ? (
                                            <button
                                                {...regionProps}
                                                type='button'
                                                aria-label={draggable ?
                                                    `Move ${id ? `issue #${id}` : 'new issue'} in ${view} view` :
                                                    `Open issue #${id}`}
                                                title={draggable ? 'Drag to reposition the issue. Press Escape to cancel.' :
                                                    undefined}
                                                onPointerDown={draggable ?
                                                    (event) => beginDrag(event, id, view) : undefined}
                                                onClick={() => { if (issue) openIssue(issue); }}
                                            />
                                        ) : <div {...regionProps} aria-hidden />)}
                                        {!!resizeHandles && corners.map((corner, index) => {
                                            if (!corner || corners.slice(0, index).some((other) => (
                                                other && Math.hypot(other[0] - corner[0], other[1] - corner[1]) < 2
                                            ))) return null;
                                            return (
                                                <button
                                                    key={index}
                                                    type='button'
                                                    className='cvat-canvas3d-issue-resize-handle'
                                                    data-issue-id={id}
                                                    data-view={view}
                                                    data-corner={index}
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
                                                top={y - canvasRect.top + 15}
                                                left={x - canvasRect.left + 15}
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
                        onCreateIssue={() => {}}
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
