// Copyright (C) 2020-2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

import { ActionUnion, createAction, ThunkAction } from 'utils/redux';
import getCore from 'cvat-core-wrapper';
import { updateTaskSuccess } from './tasks-actions';

const cvat = getCore();

export enum ReviewActionTypes {
    INITIALIZE_REVIEW_SUCCESS = 'INITIALIZE_REVIEW_SUCCESS',
    INITIALIZE_REVIEW_FAILED = 'INITIALIZE_REVIEW_FAILED',
    CREATE_ISSUE = 'CREATE_ISSUE',
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
}

export const reviewActions = {
    initializeReviewSuccess: (reviewInstance: any, frame: number) => (
        createAction(ReviewActionTypes.INITIALIZE_REVIEW_SUCCESS, { reviewInstance, frame })
    ),
    initializeReviewFailed: (error: any) => createAction(ReviewActionTypes.INITIALIZE_REVIEW_FAILED, { error }),
    createIssue: () => createAction(ReviewActionTypes.CREATE_ISSUE, {}),
    startIssue: (position: number[]) => (
        createAction(ReviewActionTypes.START_ISSUE, { position: cvat.classes.Issue.hull(position) })
    ),
    finishIssueSuccess: (frame: number, issue: any) => (
        createAction(ReviewActionTypes.FINISH_ISSUE_SUCCESS, { frame, issue })
    ),
    finishIssueFailed: (error: any) => createAction(ReviewActionTypes.FINISH_ISSUE_FAILED, { error }),
    cancelIssue: () => createAction(ReviewActionTypes.CANCEL_ISSUE),
    commentIssue: (issueId: number) => createAction(ReviewActionTypes.COMMENT_ISSUE, { issueId }),
    commentIssueSuccess: () => createAction(ReviewActionTypes.COMMENT_ISSUE_SUCCESS),
    commentIssueFailed: (error: any) => createAction(ReviewActionTypes.COMMENT_ISSUE_FAILED, { error }),
    resolveIssue: (issueId: number) => createAction(ReviewActionTypes.RESOLVE_ISSUE, { issueId }),
    resolveIssueSuccess: () => createAction(ReviewActionTypes.RESOLVE_ISSUE_SUCCESS),
    resolveIssueFailed: (error: any) => createAction(ReviewActionTypes.RESOLVE_ISSUE_FAILED, { error }),
    reopenIssue: (issueId: number) => createAction(ReviewActionTypes.REOPEN_ISSUE, { issueId }),
    reopenIssueSuccess: () => createAction(ReviewActionTypes.REOPEN_ISSUE_SUCCESS),
    reopenIssueFailed: (error: any) => createAction(ReviewActionTypes.REOPEN_ISSUE_FAILED, { error }),
    submitReview: (reviewId: number) => createAction(ReviewActionTypes.SUBMIT_REVIEW, { reviewId }),
    submitReviewSuccess: () => createAction(ReviewActionTypes.SUBMIT_REVIEW_SUCCESS),
    submitReviewFailed: (error: any) => createAction(ReviewActionTypes.SUBMIT_REVIEW_FAILED, { error }),
    removeIssueSuccess: (issueId: number, frame: number) => (
        createAction(ReviewActionTypes.REMOVE_ISSUE_SUCCESS, { issueId, frame })
    ),
    removeIssueFailed: (error: any) => createAction(ReviewActionTypes.REMOVE_ISSUE_FAILED, { error }),
    switchIssuesHiddenFlag: (hidden: boolean) => createAction(ReviewActionTypes.SWITCH_ISSUES_HIDDEN_FLAG, { hidden }),
    switchIssuesHiddenResolvedFlag: (hidden: boolean) => (
        createAction(ReviewActionTypes.SWITCH_RESOLVED_ISSUES_HIDDEN_FLAG, { hidden })
    ),
};

export type ReviewActions = ActionUnion<typeof reviewActions>;

export const initializeReviewAsync = (): ThunkAction => async (dispatch, getState) => {
    try {
        const state = getState();
        const {
            annotation: {
                job: { instance: jobInstance },
                player: {
                    frame: { number: frame },
                },
            },
        } = state;

        const reviews = await jobInstance.reviews();
        const count = reviews.length;
        let reviewInstance = null;
        if (count && reviews[count - 1].id < 0) {
            reviewInstance = reviews[count - 1];
        } else {
            reviewInstance = new cvat.classes.Review({ job: jobInstance.id });
        }

        dispatch(reviewActions.initializeReviewSuccess(reviewInstance, frame));
    } catch (error) {
        dispatch(reviewActions.initializeReviewFailed(error));
    }
};

export const finishIssueAsync = (message: string): ThunkAction => async (dispatch, getState) => {
    const state = getState();
    const {
        auth: { user },
        annotation: {
            player: {
                frame: { number: frameNumber },
            },
        },
        review: { activeReview, newIssuePosition },
    } = state;

    try {
        const issue = await activeReview.openIssue({
            frame: frameNumber,
            position: newIssuePosition,
            owner: user,
            comment_set: [
                {
                    message,
                    author: user,
                },
            ],
        });
        await activeReview.toLocalStorage();
        dispatch(reviewActions.finishIssueSuccess(frameNumber, issue));
    } catch (error) {
        dispatch(reviewActions.finishIssueFailed(error));
    }
};

export const commentIssueAsync = (id: number, message: string): ThunkAction => async (dispatch, getState) => {
    const state = getState();
    const {
        auth: { user },
        review: { frameIssues, activeReview },
    } = state;

    try {
        dispatch(reviewActions.commentIssue(id));
        const [issue] = frameIssues.filter((_issue: any): boolean => _issue.id === id);
        await issue.comment({
            message,
            author: user,
        });
        if (activeReview && activeReview.issues.includes(issue)) {
            await activeReview.toLocalStorage();
        }
        dispatch(reviewActions.commentIssueSuccess());
    } catch (error) {
        dispatch(reviewActions.commentIssueFailed(error));
    }
};

export const resolveIssueAsync = (id: number): ThunkAction => async (dispatch, getState) => {
    const state = getState();
    const {
        auth: { user },
        review: { frameIssues, activeReview },
    } = state;

    try {
        dispatch(reviewActions.resolveIssue(id));
        const [issue] = frameIssues.filter((_issue: any): boolean => _issue.id === id);
        await issue.resolve(user);
        if (activeReview && activeReview.issues.includes(issue)) {
            await activeReview.toLocalStorage();
        }

        dispatch(reviewActions.resolveIssueSuccess());
    } catch (error) {
        dispatch(reviewActions.resolveIssueFailed(error));
    }
};

export const reopenIssueAsync = (id: number): ThunkAction => async (dispatch, getState) => {
    const state = getState();
    const {
        auth: { user },
        review: { frameIssues, activeReview },
    } = state;

    try {
        dispatch(reviewActions.reopenIssue(id));
        const [issue] = frameIssues.filter((_issue: any): boolean => _issue.id === id);
        await issue.reopen(user);
        if (activeReview && activeReview.issues.includes(issue)) {
            await activeReview.toLocalStorage();
        }

        dispatch(reviewActions.reopenIssueSuccess());
    } catch (error) {
        dispatch(reviewActions.reopenIssueFailed(error));
    }
};

export const submitReviewAsync = (review: any): ThunkAction => async (dispatch, getState) => {
    const state = getState();
    const {
        annotation: {
            job: { instance: jobInstance },
        },
    } = state;

    try {
        dispatch(reviewActions.submitReview(review.id));
        await review.submit(jobInstance.id);

        const [task] = await cvat.tasks.get({ id: jobInstance.task.id });
        dispatch(updateTaskSuccess(task, jobInstance.task.id));
        dispatch(reviewActions.submitReviewSuccess());
    } catch (error) {
        dispatch(reviewActions.submitReviewFailed(error));
    }
};

export const deleteIssueAsync = (id: number): ThunkAction => async (dispatch, getState) => {
    const state = getState();
    const {
        review: { frameIssues, activeReview },
        annotation: {
            player: {
                frame: { number: frameNumber },
            },
        },
    } = state;

    try {
        const [issue] = frameIssues.filter((_issue: any): boolean => _issue.id === id);
        await issue.delete();
        if (activeReview !== null) {
            await activeReview.deleteIssue(id);
            await activeReview.toLocalStorage();
        }
        dispatch(reviewActions.removeIssueSuccess(id, frameNumber));
    } catch (error) {
        dispatch(reviewActions.removeIssueFailed(error));
    }
};
