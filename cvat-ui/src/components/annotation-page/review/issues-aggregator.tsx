// Copyright (C) 2020-2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';

import { CombinedState } from 'reducers/interfaces';
import { Canvas } from 'cvat-canvas/src/typescript/canvas';

import { commentIssueAsync, resolveIssueAsync, reopenIssueAsync } from 'actions/review-actions';

import CreateIssueDialog from './create-issue-dialog';
import HiddenIssueLabel from './hidden-issue-label';
import IssueDialog from './issue-dialog';

const scaleHandler = (canvasInstance: Canvas): void => {
    const { geometry } = canvasInstance;
    const createDialogs = window.document.getElementsByClassName('cvat-create-issue-dialog');
    const hiddenIssues = window.document.getElementsByClassName('cvat-hidden-issue-label');
    const issues = window.document.getElementsByClassName('cvat-issue-dialog');
    for (const element of [...Array.from(createDialogs), ...Array.from(hiddenIssues), ...Array.from(issues)]) {
        (element as HTMLSpanElement).style.transform = `scale(${1 / geometry.scale}) rotate(${-geometry.angle}deg)`;
    }
};

export default function IssueAggregatorComponent(): JSX.Element | null {
    const dispatch = useDispatch();
    const [expandedIssue, setExpandedIssue] = useState<number | null>(null);
    const frameIssues = useSelector((state: CombinedState): any[] => state.review.frameIssues);
    const canvasInstance = useSelector((state: CombinedState) => state.annotation.canvas.instance);
    const canvasIsReady = useSelector((state: CombinedState): boolean => state.annotation.canvas.ready);
    const newIssuePosition = useSelector((state: CombinedState): number[] | null => state.review.newIssuePosition);
    const issuesHidden = useSelector((state: CombinedState): any => state.review.issuesHidden);
    const issuesResolvedHidden = useSelector((state: CombinedState): any => state.review.issuesResolvedHidden);
    const issueFetching = useSelector((state: CombinedState): number | null => state.review.fetching.issueId);
    const issueLabels: JSX.Element[] = [];
    const issueDialogs: JSX.Element[] = [];

    if (!(canvasInstance instanceof Canvas)) return null;

    useEffect(() => {
        scaleHandler(canvasInstance);
    });

    useEffect(() => {
        const regions = frameIssues.reduce((acc: Record<number, number[]>, issue: any): Record<number, number[]> => {
            acc[issue.id] = issue.position;
            return acc;
        }, {});

        if (newIssuePosition) {
            regions[0] = newIssuePosition;
        }

        canvasInstance.setupIssueRegions(regions);

        if (newIssuePosition) {
            setExpandedIssue(null);
            const element = window.document.getElementById('cvat_canvas_issue_region_0');
            if (element) {
                element.style.display = 'block';
            }
        }
    }, [newIssuePosition]);

    useEffect(() => {
        const listener = (): void => scaleHandler(canvasInstance);

        canvasInstance.html().addEventListener('canvas.zoom', listener);
        canvasInstance.html().addEventListener('canvas.fit', listener);

        return () => {
            canvasInstance.html().removeEventListener('canvas.zoom', listener);
            canvasInstance.html().removeEventListener('canvas.fit', listener);
        };
    }, []);

    if (!canvasIsReady) {
        return null;
    }

    const { geometry } = canvasInstance;
    for (const issue of frameIssues) {
        if (issuesHidden) break;
        if (issuesResolvedHidden && !!issue.resolvedDate) continue;
        const issueResolved = !!issue.resolver;
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
                    element.style.display = '';
                }
            }
        };

        if (expandedIssue === id) {
            issueDialogs.push(
                <IssueDialog
                    key={issue.id}
                    id={issue.id}
                    top={minY}
                    left={minX}
                    isFetching={issueFetching !== null}
                    comments={issue.comments}
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
        } else if (issue.comments.length) {
            issueLabels.push(
                <HiddenIssueLabel
                    key={issue.id}
                    id={issue.id}
                    top={minY}
                    left={minX}
                    resolved={issueResolved}
                    message={issue.comments[issue.comments.length - 1].message}
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

    return (
        <>
            {createLeft !== null && createTop !== null && <CreateIssueDialog top={createTop} left={createLeft} />}
            {issueDialogs}
            {issueLabels}
        </>
    );
}
