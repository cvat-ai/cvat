// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { ActionUnion, createAction, ThunkAction } from 'utils/redux';
import {
    getCore, Issue, IssueView, DimensionType, User,
} from 'cvat-core-wrapper';
import { NewIssueSource, ReviewState } from 'reducers';
import { ensureError } from 'utils/error-handling';

const cvat = getCore();

export enum ReviewActionTypes {
    START_ISSUE = 'START_ISSUE',
    FINISH_ISSUE_SUCCESS = 'FINISH_ISSUE_SUCCESS',
    FINISH_ISSUE_FAILED = 'FINISH_ISSUE_FAILED',
    CANCEL_ISSUE = 'CANCEL_ISSUE',
    RESOLVE_ISSUE = 'RESOLVE_ISSUE',
    RESOLVE_ISSUE_SUCCESS = 'RESOLVE_ISSUE_SUCCESS',
    RESOLVE_ISSUE_FAILED = 'RESOLVE_ISSUE_FAILED',
    REOPEN_ISSUE = 'REOPEN_ISSUE',
    REOPEN_ISSUE_SUCCESS = 'REOPEN_ISSUE_SUCCESS',
    REOPEN_ISSUE_FAILED = 'REOPEN_ISSUE_FAILED',
    COMMENT_ISSUE = 'COMMENT_ISSUE',
    COMMENT_ISSUE_SUCCESS = 'COMMENT_ISSUE_SUCCESS',
    COMMENT_ISSUE_FAILED = 'COMMENT_ISSUE_FAILED',
    REMOVE_ISSUE_SUCCESS = 'REMOVE_ISSUE_SUCCESS',
    REMOVE_ISSUE_FAILED = 'REMOVE_ISSUE_FAILED',
    SUBMIT_REVIEW = 'SUBMIT_REVIEW',
    SUBMIT_REVIEW_SUCCESS = 'SUBMIT_REVIEW_SUCCESS',
    SUBMIT_REVIEW_FAILED = 'SUBMIT_REVIEW_FAILED',
    SWITCH_ISSUES_HIDDEN_FLAG = 'SWITCH_ISSUES_HIDDEN_FLAG',
    SWITCH_RESOLVED_ISSUES_HIDDEN_FLAG = 'SWITCH_RESOLVED_ISSUES_HIDDEN_FLAG',
    SELECT_ISSUE = 'SELECT_ISSUE',
    HIGHLIGHT_ISSUE = 'HIGHLIGHT_ISSUE',
    MOVE_ISSUE = 'MOVE_ISSUE',
    MOVE_ISSUE_SUCCESS = 'MOVE_ISSUE_SUCCESS',
    MOVE_ISSUE_FAILED = 'MOVE_ISSUE_FAILED',
    MOVE_DRAFT_ISSUE = 'MOVE_DRAFT_ISSUE',
}

export const reviewActions = {
    startIssue: (
        position: number[], source = NewIssueSource.ISSUE_TOOL,
        view: IssueView | null = null,
        dimension = DimensionType.DIMENSION_2D,
    ) => (
        createAction(ReviewActionTypes.START_ISSUE, {
            position: dimension === DimensionType.DIMENSION_3D ? [...position] : cvat.classes.Issue.hull(position),
            source,
            view,
        })
    ),
    selectIssue: (issueId: number | null) => createAction(ReviewActionTypes.SELECT_ISSUE, { issueId }),
    highlightIssue: (issueId: number | null) => createAction(ReviewActionTypes.HIGHLIGHT_ISSUE, { issueId }),
    moveDraftIssue: (position: number[]) => createAction(ReviewActionTypes.MOVE_DRAFT_ISSUE, { position }),
    finishIssueSuccess: (frame: number, issue: Issue, draft: ReviewState['newIssue'], dimension: DimensionType) => (
        createAction(ReviewActionTypes.FINISH_ISSUE_SUCCESS, {
            frame, issue, draft, dimension,
        })
    ),
    finishIssueFailed: (error: unknown, draft: ReviewState['newIssue']) => (
        createAction(ReviewActionTypes.FINISH_ISSUE_FAILED, { error: ensureError(error), draft })
    ),
    cancelIssue: () => createAction(ReviewActionTypes.CANCEL_ISSUE),
    commentIssue: (issueId: number) => createAction(ReviewActionTypes.COMMENT_ISSUE, { issueId }),
    commentIssueSuccess: () => createAction(ReviewActionTypes.COMMENT_ISSUE_SUCCESS),
    commentIssueFailed: (error: unknown) => (
        createAction(ReviewActionTypes.COMMENT_ISSUE_FAILED, { error: ensureError(error) })
    ),
    resolveIssue: (issueId: number) => createAction(ReviewActionTypes.RESOLVE_ISSUE, { issueId }),
    resolveIssueSuccess: () => createAction(ReviewActionTypes.RESOLVE_ISSUE_SUCCESS),
    resolveIssueFailed: (error: unknown) => (
        createAction(ReviewActionTypes.RESOLVE_ISSUE_FAILED, { error: ensureError(error) })
    ),
    reopenIssue: (issueId: number) => createAction(ReviewActionTypes.REOPEN_ISSUE, { issueId }),
    reopenIssueSuccess: () => createAction(ReviewActionTypes.REOPEN_ISSUE_SUCCESS),
    reopenIssueFailed: (error: unknown) => (
        createAction(ReviewActionTypes.REOPEN_ISSUE_FAILED, { error: ensureError(error) })
    ),
    moveIssue: (issueId: number) => createAction(ReviewActionTypes.MOVE_ISSUE, { issueId }),
    moveIssueSuccess: () => createAction(ReviewActionTypes.MOVE_ISSUE_SUCCESS),
    moveIssueFailed: (error: unknown) => (
        createAction(ReviewActionTypes.MOVE_ISSUE_FAILED, { error: ensureError(error) })
    ),
    submitReview: (jobId: number) => createAction(ReviewActionTypes.SUBMIT_REVIEW, { jobId }),
    submitReviewSuccess: () => createAction(ReviewActionTypes.SUBMIT_REVIEW_SUCCESS),
    submitReviewFailed: (error: unknown, jobId: number) => (
        createAction(ReviewActionTypes.SUBMIT_REVIEW_FAILED, { error: ensureError(error), jobId })
    ),
    removeIssueSuccess: (issueId: number, frame: number) => (
        createAction(ReviewActionTypes.REMOVE_ISSUE_SUCCESS, { issueId, frame })
    ),
    removeIssueFailed: (error: unknown) => (
        createAction(ReviewActionTypes.REMOVE_ISSUE_FAILED, { error: ensureError(error) })
    ),
    switchIssuesHiddenFlag: (hidden: boolean) => createAction(ReviewActionTypes.SWITCH_ISSUES_HIDDEN_FLAG, { hidden }),
    switchIssuesHiddenResolvedFlag: (hidden: boolean) => (
        createAction(ReviewActionTypes.SWITCH_RESOLVED_ISSUES_HIDDEN_FLAG, { hidden })
    ),
};

export type ReviewActions = ActionUnion<typeof reviewActions>;

function updateIssueAsync(
    issueId: number,
    update: (issue: Issue, user: User) => Promise<void>,
    start: (id: number) => ReviewActions,
    success: () => ReviewActions,
    failure: (error: unknown) => ReviewActions,
): ThunkAction {
    return async (dispatch, getState) => {
        const state = getState();
        const { annotation: { job: { instance: job } }, auth: { user } } = state;
        const issue = state.review.frameIssues.find((item) => item.id === issueId);
        if (!issue) return;

        dispatch(start(issueId));
        try {
            await update(issue, user);
            if (getState().annotation.job.instance === job) dispatch(success());
        } catch (error) {
            if (getState().annotation.job.instance === job) dispatch(failure(error));
        }
    };
}

export const moveIssueAsync = (issueId: number, position: number[]): ThunkAction => updateIssueAsync(
    issueId,
    (issue) => issue.move(position),
    reviewActions.moveIssue,
    reviewActions.moveIssueSuccess,
    reviewActions.moveIssueFailed,
);

export const commentIssueAsync = (issueId: number, message: string): ThunkAction => updateIssueAsync(
    issueId,
    async (issue, user) => { await issue.comment({ message, owner: user }); },
    reviewActions.commentIssue,
    reviewActions.commentIssueSuccess,
    reviewActions.commentIssueFailed,
);

export const resolveIssueAsync = (issueId: number): ThunkAction => updateIssueAsync(
    issueId,
    (issue, user) => issue.resolve(user),
    reviewActions.resolveIssue,
    reviewActions.resolveIssueSuccess,
    reviewActions.resolveIssueFailed,
);

export const reopenIssueAsync = (issueId: number): ThunkAction => updateIssueAsync(
    issueId,
    (issue) => issue.reopen(),
    reviewActions.reopenIssue,
    reviewActions.reopenIssueSuccess,
    reviewActions.reopenIssueFailed,
);

export const finishIssueAsync = (message: string): ThunkAction => async (dispatch, getState) => {
    const { annotation, review: { newIssue: draft } } = getState();
    const { number: frameNumber } = annotation.player.frame;
    const { instance: jobInstance } = annotation.job;
    const { position, view } = draft;
    if (!position) return;

    try {
        const issue = new cvat.classes.Issue({
            job: jobInstance.id,
            frame: frameNumber,
            position,
            view,
        });

        const savedIssue = await jobInstance.openIssue(issue, message);
        if (getState().annotation.job.instance === jobInstance) {
            dispatch(reviewActions.finishIssueSuccess(
                getState().annotation.player.frame.number, savedIssue, draft, jobInstance.dimension,
            ));
        }
    } catch (error) {
        if (getState().annotation.job.instance === jobInstance) dispatch(reviewActions.finishIssueFailed(error, draft));
    }
};

export const deleteIssueAsync = (issueId: number): ThunkAction => async (dispatch, getState) => {
    const { annotation: { job: { instance: job } }, review: { frameIssues } } = getState();
    const issue = frameIssues.find((item) => item.id === issueId);
    if (!issue) return;

    try {
        await issue.delete();
        const { annotation } = getState();
        if (annotation.job.instance === job) {
            dispatch(reviewActions.removeIssueSuccess(issueId, annotation.player.frame.number));
        }
    } catch (error) {
        if (getState().annotation.job.instance === job) dispatch(reviewActions.removeIssueFailed(error));
    }
};
