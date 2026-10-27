// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React, { useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { useDispatch, useSelector } from 'react-redux';
import { CombinedState, ActiveControl, NewIssueSource } from 'reducers';
import { Canvas3d, ViewType } from 'cvat-canvas3d-wrapper';
import { Issue } from 'cvat-core-wrapper';
import {
    commentIssueAsync, moveIssueAsync, reopenIssueAsync, resolveIssueAsync, reviewActions,
} from 'actions/review-actions';
import { switchNavigationBlocked, updateActiveControl } from 'actions/annotation-actions';
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
}

export default function Review3D(): JSX.Element {
    const dispatch = useDispatch<ThunkDispatch>();
    const {
        canvas, ready, activeControl, issues, newPosition, newSource,
        hidden, resolvedHidden, activeIssueId, highlightedIssueId, fetching,
        frame, job, navigationBlocked,
    } = useSelector((state: CombinedState) => ({
        canvas: state.annotation.canvas.instance as Canvas3d,
        ready: state.annotation.canvas.ready,
        activeControl: state.annotation.canvas.activeControl,
        issues: state.review.frameIssues as Issue[],
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
    }), shallowEqual);
    const [container, setContainer] = useState<HTMLDivElement | null>(null);
    const [dialogContainer, setDialogContainer] = useState<HTMLDivElement | null>(null);
    const [placements, setPlacements] = useState<Placement[]>([]);
    const lastDialogPlacement = useRef<Placement | null>(null);
    const [creating, setCreating] = useState(false);
    const [preview, setPreview] = useState<{ drag: MarkerDrag; position: number[] } | null>(null);
    const dragRef = useRef<MarkerDrag | null>(null);
    const navigationOwner = useRef<MarkerDrag | null>(null);
    const suppressClick = useRef({ id: -1, until: 0 });
    const isMounted = useIsMounted();

    const beginDrag = (event: React.PointerEvent<HTMLElement>, id: number, view: ViewType): void => {
        if (event.button !== 0 || view === ViewType.PERSPECTIVE || !ready || creating || fetching ||
            activeControl !== ActiveControl.CURSOR || navigationBlocked || dragRef.current) return;
        const issue = issues.find((item) => item.id === id) || null;
        const origin = id === 0 ? newPosition : issue?.position;
        if (!origin || origin.length !== 3) return;
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
                if (!cancel && drag.moved) {
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
            const next = canvas.movePosition(drag.origin, drag.view, drag.start, [
                Math.max(rect.left, Math.min(event.clientX, rect.right)),
                Math.max(rect.top, Math.min(event.clientY, rect.bottom)),
            ]);
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
                cancel();
            }
        };
        window.addEventListener('pointermove', move, { passive: false });
        window.addEventListener('pointerup', up);
        window.addEventListener('pointercancel', cancel);
        window.addEventListener('blur', cancel);
        window.addEventListener('keydown', onKeyDown);
        return () => {
            window.removeEventListener('pointermove', move);
            window.removeEventListener('pointerup', up);
            window.removeEventListener('pointercancel', cancel);
            window.removeEventListener('blur', cancel);
            window.removeEventListener('keydown', onKeyDown);
            dragRef.current = null;
            setPreview(null);
            if (navigationOwner.current) releaseNavigation(navigationOwner.current);
        };
    }, [canvas, ready, frame, job]);

    useEffect(() => {
        if (!ready) return undefined;
        const { perspective } = canvas.html();
        let start: [number, number] | null = null;
        let dragged = false;
        const onPointerDown = (event: MouseEvent): void => {
            start = event.button === 0 ? [event.clientX, event.clientY] : null;
            dragged = false;
        };
        const onPointerMove = (event: MouseEvent): void => {
            if (start && event.buttons === 1 && Math.hypot(event.clientX - start[0], event.clientY - start[1]) > 5) {
                dragged = true;
            }
        };
        const onClick = (event: MouseEvent): void => {
            const origin = start;
            start = null;
            if (activeControl !== ActiveControl.OPEN_ISSUE || !origin || dragged ||
                Math.hypot(event.clientX - origin[0], event.clientY - origin[1]) > 5) return;
            const position = canvas.pickPosition(event.clientX, event.clientY);
            if (position) {
                canvas.selectRegion(false);
                dispatch(updateActiveControl(ActiveControl.CURSOR));
                dispatch(reviewActions.startIssue(position));
            }
        };
        perspective.addEventListener('mousedown', onPointerDown);
        window.addEventListener('mousemove', onPointerMove);
        perspective.addEventListener('click', onClick);
        return () => {
            perspective.removeEventListener('mousedown', onPointerDown);
            window.removeEventListener('mousemove', onPointerMove);
            perspective.removeEventListener('click', onClick);
        };
    }, [canvas, ready, activeControl]);

    useEffect(() => {
        if (!ready) {
            setPlacements([]);
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
                        });
                    }
                });
            });
            const signature = next.map(({
                id, view, x, y, canvasRect, expanded,
            }) => [
                id, view, x, y, expanded,
                canvasRect.left, canvasRect.top, canvasRect.width, canvasRect.height,
            ].join(':')).join('|');
            if (signature !== previous) {
                previous = signature;
                setPlacements(next);
            }
            animationFrame = requestAnimationFrame(updatePositions);
        };
        updatePositions();
        return () => cancelAnimationFrame(animationFrame);
    }, [canvas, ready, issues, newPosition, preview]);

    const visibleIssues = hidden ? [] : issues.filter((issue) => !resolvedHidden || !issue.resolved);
    const activeIssue = visibleIssues.find((issue) => issue.id === activeIssueId);
    const dialogId = newPosition ? 0 : activeIssueId;
    const activePlacement = placements.find(({ id, view, expanded }) => (
        id === dialogId && (view === ViewType.PERSPECTIVE || expanded)
    ));
    useEffect(() => {
        if (activePlacement) lastDialogPlacement.current = activePlacement;
    }, [activePlacement]);
    const dialogPlacement = activePlacement || lastDialogPlacement.current;
    const dialogPosition = dialogPlacement && {
        container: dialogContainer,
        top: dialogPlacement.y + 15,
        left: dialogPlacement.x + 15,
        angle: 0,
        scale: 1,
        clientCoordinates: [dialogPlacement.x + 15, dialogPlacement.y + 15] as [number, number],
        canvasRect: dialogPlacement.canvasRect,
    };
    const showRegion = (issue: Issue, show: boolean): void => {
        window.document.querySelectorAll<HTMLElement>(
            `.cvat-canvas3d-issue-region[data-issue-id="${issue.id}"]`,
        ).forEach((element) => {
            element.style.visibility = show || !issue.resolved ? 'visible' : 'hidden';
        });
    };

    const openIssue = (issue: Issue): void => {
        if (suppressClick.current.id === issue.id && Date.now() < suppressClick.current.until) return;
        if (Object.values(ViewType).some((view) => !canvas.projectPosition(issue.position, view))) {
            canvas.focusPosition(issue.position);
        }
        dispatch(reviewActions.selectIssue(issue.id));
    };

    return (
        <>
            <div
                ref={setContainer}
                className={`cvat-canvas3d-issues ${preview ? 'cvat-canvas3d-issues-dragging' : ''}`}
            >
                <div ref={setDialogContainer} hidden={!activePlacement} />
            </div>
            {ready && container && placements.map(({
                id, view, x, y, canvasRect, expanded,
            }) => {
                const issue = visibleIssues.find((item) => item.id === id);
                if (!issue && !(id === 0 && newPosition)) return null;
                const draggable = view !== ViewType.PERSPECTIVE && !creating && !fetching &&
                    activeControl === ActiveControl.CURSOR &&
                    (id !== 0 || newSource === NewIssueSource.ISSUE_TOOL);
                const regionProps = {
                    className: `cvat-canvas3d-issue-region ${highlightedIssueId === id || preview?.drag.id === id ? 'cvat-canvas3d-issue-highlighted' : ''}`,
                    'data-issue-id': id,
                    'data-view': view,
                    style: {
                        left: x,
                        top: y,
                        visibility: issue?.resolved && highlightedIssueId !== id && preview?.drag.id !== id ?
                            'hidden' as const : 'visible' as const,
                    },
                };
                const position = {
                    container,
                    top: y + 15,
                    left: x + 15,
                    angle: 0,
                    scale: 1,
                    clientCoordinates: [x + 15, y + 15] as [number, number],
                    canvasRect,
                };

                return (
                    <React.Fragment key={`${view}-${id}`}>
                        {ReactDOM.createPortal(draggable ? (
                            <button
                                {...regionProps}
                                type='button'
                                aria-label={`Move ${id ? `issue #${id}` : 'new issue'} in ${view} view`}
                                title='Drag to reposition the issue. Press Escape to cancel.'
                                onPointerDown={(event) => beginDrag(event, id, view)}
                                onClick={() => { if (issue) openIssue(issue); }}
                            />
                        ) : <div {...regionProps} aria-hidden />, container)}
                        {issue && !(activeIssueId === id && (view === ViewType.PERSPECTIVE || expanded)) && (
                            <HiddenIssueLabel
                                {...position}
                                idSuffix={`-${view}`}
                                issue={issue}
                                resolved={issue.resolved}
                                highlight={() => showRegion(issue, true)}
                                blur={() => showRegion(issue, false)}
                                onPointerDown={draggable ? (event) => beginDrag(event, id, view) : undefined}
                                onClick={() => openIssue(issue)}
                            />
                        )}
                    </React.Fragment>
                );
            })}
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
