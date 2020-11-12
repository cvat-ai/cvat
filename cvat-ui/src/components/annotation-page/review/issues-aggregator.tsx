// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';

import { CombinedState, Workspace } from 'reducers/interfaces';
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
    const [expandedIssues, setExpandedIssues] = useState<number[]>([]);
    const frameIssues = useSelector((state: CombinedState): any[] => state.review.frameIssues);
    const canvasInstance = useSelector((state: CombinedState): Canvas => state.annotation.canvas.instance);
    const canvasIsReady = useSelector((state: CombinedState): boolean => state.annotation.canvas.ready);
    const newIssuePosition = useSelector((state: CombinedState): number[] | null => state.review.newIssuePosition);
    const workspace = useSelector((state: CombinedState): Workspace => state.annotation.workspace);
    const issueLabels: JSX.Element[] = [];
    const issueDialogs: JSX.Element[] = [];

    useEffect(() => {
        scaleHandler(canvasInstance);
    });

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
        const issueResolved = !!issue.resolver;
        if (issueResolved && workspace !== Workspace.REVIEW_WORKSPACE) {
            // show only unresolved issues on annotation views
            // eslint-disable-next-line
            continue;
        }
        const offset = 15;
        const translated = issue.position.map((coord: number): number => coord + geometry.offset);
        const maxX = Math.max(...translated.filter((_: number, idx: number): boolean => idx % 2 === 0)) + offset;
        const minY = Math.min(...translated.filter((_: number, idx: number): boolean => idx % 2 !== 0)) + offset;
        if (expandedIssues.includes(issue.id)) {
            issueDialogs.push(
                <IssueDialog
                    key={issue.id}
                    id={issue.id}
                    top={minY}
                    left={maxX}
                    comments={issue.comments}
                    resolved={issueResolved}
                    collapse={() => {
                        setExpandedIssues(expandedIssues.filter((issueID: number): boolean => issueID !== issue.id));
                    }}
                    resolve={() => {
                        dispatch(resolveIssueAsync(issue.id));
                        setExpandedIssues(expandedIssues.filter((issueID: number): boolean => issueID !== issue.id));
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
                    left={maxX}
                    resolved={issueResolved}
                    message={issue.comments[issue.comments.length - 1].message}
                    onClick={() => {
                        setExpandedIssues([...expandedIssues, issue.id]);
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
