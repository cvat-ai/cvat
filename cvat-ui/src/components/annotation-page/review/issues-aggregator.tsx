// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React, { useState, useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';

import { ActiveControl, CombinedState } from 'reducers';
import { Canvas } from 'cvat-canvas/src/typescript/canvas';

import { commentIssueAsync, resolveIssueAsync, reopenIssueAsync } from 'actions/review-actions';
import {
    AnnotationConflict, ConflictSeverity, ObjectState, QualityConflict,
} from 'cvat-core-wrapper';

import { highlightConflict } from 'actions/annotation-actions';
import CreateIssueDialog from './create-issue-dialog';
import HiddenIssueLabel from './hidden-issue-label';
import IssueDialog from './issue-dialog';
import ConflictLabel from './conflict-label';

interface ConflictMappingElement {
    description: string;
    severity: ConflictSeverity;
    x: number;
    y: number;
    clientID: number;
    conflict: QualityConflict;
}

export default function IssueAggregatorComponent(): JSX.Element | null {
    const dispatch = useDispatch();
    const [expandedIssue, setExpandedIssue] = useState<number | null>(null);
    const frameIssues = useSelector((state: CombinedState): any[] => state.review.frameIssues);
    const issuesHidden = useSelector((state: CombinedState): boolean => state.review.issuesHidden);
    const issuesResolvedHidden = useSelector((state: CombinedState): boolean => state.review.issuesResolvedHidden);
    const canvasInstance = useSelector((state: CombinedState) => state.annotation.canvas.instance);
    const canvasIsReady = useSelector((state: CombinedState): boolean => state.annotation.canvas.ready);
    const newIssuePosition = useSelector((state: CombinedState): number[] | null => state.review.newIssuePosition);
    const issueFetching = useSelector((state: CombinedState): number | null => state.review.fetching.issueId);
    const [geometry, setGeometry] = useState<Canvas['geometry'] | null>(null);

    const qualityConflicts = useSelector((state: CombinedState) => state.review.frameConflicts);
    const objectStates = useSelector((state: CombinedState) => state.annotation.annotations.states);
    const showConflicts = useSelector((state: CombinedState) => state.settings.shapes.showGroundTruth);
    const highlightedConflict = useSelector((state: CombinedState) => state.annotation.annotations.highlightedConflict);

    const highlightedObjectsIDs = highlightedConflict?.annotationConflicts?.map((c: AnnotationConflict) => c.clientID);

    const activeControl = useSelector((state: CombinedState) => state.annotation.canvas.activeControl);

    const canvasReady = canvasInstance instanceof Canvas && canvasIsReady;

    const onEnter = useCallback((conflict: QualityConflict) => {
        if (canvasReady && activeControl === ActiveControl.CURSOR) {
            dispatch(highlightConflict(conflict));
        }
    }, [canvasReady, activeControl]);
    const onLeave = useCallback(() => {
        if (canvasReady && activeControl === ActiveControl.CURSOR) {
            dispatch(highlightConflict(null));
        }
    }, [canvasReady, activeControl]);

    const [conflictMapping, setConflictMapping] = useState<ConflictMappingElement[]>([]);

    const issueLabels: JSX.Element[] = [];
    const issueDialogs: JSX.Element[] = [];
    const conflictLabels: JSX.Element[] = [];

    useEffect(() => {
        if (canvasReady) {
            const { geometry: updatedGeometry } = canvasInstance;
            setGeometry(updatedGeometry);

            const geometryListener = (): void => {
                setGeometry(canvasInstance.geometry);
            };

            canvasInstance.html().addEventListener('canvas.zoom', geometryListener);
            canvasInstance.html().addEventListener('canvas.fit', geometryListener);
            canvasInstance.html().addEventListener('canvas.reshape', geometryListener);

            return () => {
                canvasInstance.html().removeEventListener('canvas.zoom', geometryListener);
                canvasInstance.html().removeEventListener('canvas.fit', geometryListener);
                canvasInstance.html().addEventListener('canvas.reshape', geometryListener);
            };
        }

        return () => {};
    }, [canvasReady]);

    useEffect(() => {
        if (canvasReady) {
            type IssueRegionSet = Record<number, { hidden: boolean; points: number[] }>;
            const regions = !issuesHidden ? frameIssues
                .filter((_issue: any) => !issuesResolvedHidden || !_issue.resolved)
                .reduce((acc: IssueRegionSet, issue: any): IssueRegionSet => {
                    acc[issue.id] = {
                        points: issue.position,
                        hidden: issue.resolved,
                    };
                    return acc;
                }, {}) : {};

            if (newIssuePosition) {
                // regions[0] is always empty because key is an id of an issue (<0, >0 are possible)
                regions[0] = {
                    points: newIssuePosition,
                    hidden: false,
                };
            }

            canvasInstance.setupIssueRegions(regions);

            if (newIssuePosition) {
                setExpandedIssue(null);
                const element = window.document.getElementById('cvat_canvas_issue_region_0');
                if (element) {
                    element.style.display = 'block';
                }
            }
        }
    }, [newIssuePosition, frameIssues, issuesResolvedHidden, issuesHidden, canvasReady, showConflicts]);

    useEffect(() => {
        if (canvasReady && showConflicts) {
            const newconflictMapping = qualityConflicts.map((conflict: QualityConflict) => {
                const c = conflict.annotationConflicts[0];
                const state = objectStates.find((s: ObjectState) => s.jobID === c.jobID && s.serverID === c.serverID);
                if (state) {
                    const points = canvasInstance.setupConflictsRegions(state);
                    if (points) {
                        return {
                            description: conflict.description,
                            severity: conflict.severity,
                            x: points[0],
                            y: points[1],
                            clientID: c.clientID,
                            conflict,
                        };
                    }
                }
                return null;
            }).filter((element) => element);
            setConflictMapping(newconflictMapping as ConflictMappingElement[]);
        } else {
            setConflictMapping([]);
        }
    }, [geometry, objectStates, showConflicts, canvasReady]);

    if (!canvasReady || !geometry) {
        return null;
    }

    for (const issue of frameIssues) {
        if (issuesHidden) break;
        const issueResolved = issue.resolved;
        if (issuesResolvedHidden && issueResolved) continue;
        const offset = 15;
        const translated = issue.position.map((coord: number): number => coord + geometry.offset);
        const minX = Math.min(...translated.filter((_: number, idx: number): boolean => idx % 2 === 0)) + offset;
        const minY = Math.min(...translated.filter((_: number, idx: number): boolean => idx % 2 !== 0)) + offset;
        const { id } = issue;
        const highlight = (): void => {
            const element = window.document.getElementById(`cvat_canvas_issue_region_${id}`);
            if (element) {
                element.style.display = 'block';
            }
        };

        const blur = (): void => {
            if (issueResolved) {
                const element = window.document.getElementById(`cvat_canvas_issue_region_${id}`);
                if (element) {
                    element.style.display = 'none';
                }
            }
        };

        if (expandedIssue === id) {
            issueDialogs.push(
                <IssueDialog
                    key={issue.id}
                    issue={issue}
                    top={minY}
                    left={minX}
                    angle={-geometry.angle}
                    scale={1 / geometry.scale}
                    isFetching={issueFetching !== null}
                    resolved={issueResolved}
                    highlight={highlight}
                    blur={blur}
                    collapse={() => {
                        setExpandedIssue(null);
                    }}
                    resolve={() => {
                        dispatch(resolveIssueAsync(issue.id));
                        setExpandedIssue(null);
                    }}
                    reopen={() => {
                        dispatch(reopenIssueAsync(issue.id));
                    }}
                    comment={(message: string) => {
                        dispatch(commentIssueAsync(issue.id, message));
                    }}
                />,
            );
        } else {
            issueLabels.push(
                <HiddenIssueLabel
                    key={issue.id}
                    issue={issue}
                    top={minY}
                    left={minX}
                    angle={-geometry.angle}
                    scale={1 / geometry.scale}
                    resolved={issueResolved}
                    highlight={highlight}
                    blur={blur}
                    onClick={() => {
                        setExpandedIssue(id);
                    }}
                />,
            );
        }
    }

    const translated = newIssuePosition ? newIssuePosition.map((coord: number): number => coord + geometry.offset) : [];
    const createLeft = translated.length ?
        Math.max(...translated.filter((_: number, idx: number): boolean => idx % 2 === 0)) :
        null;
    const createTop = translated.length ?
        Math.min(...translated.filter((_: number, idx: number): boolean => idx % 2 !== 0)) :
        null;

    for (const conflict of conflictMapping) {
        conflictLabels.push(
            <ConflictLabel
                key={(Math.random() + 1).toString(36).substring(7)}
                text={conflict.description}
                top={conflict.y}
                left={conflict.x}
                angle={-geometry.angle}
                scale={1 / geometry.scale}
                severity={conflict.severity}
                darken={!!highlightedConflict && !!highlightedObjectsIDs &&
                        (!highlightedObjectsIDs.includes(conflict.clientID))}
                conflict={conflict.conflict}
                onEnter={onEnter}
                onLeave={onLeave}
                tooltipVisible={!!highlightedConflict && !!highlightedObjectsIDs &&
                        highlightedObjectsIDs.includes(conflict.clientID)}
            />,
        );
    }

    return (
        <>
            {createLeft !== null && createTop !== null ? (
                <CreateIssueDialog
                    top={createTop}
                    left={createLeft}
                    angle={-geometry.angle}
                    scale={1 / geometry.scale}
                />
            ) : null}
            {issueDialogs}
            {issueLabels}
            {conflictLabels}
        </>
    );
}
