// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import { ActionUnion, createAction, ThunkAction } from 'utils/redux';
import getCore from 'cvat-core-wrapper';

const cvat = getCore();

export enum ReviewActionTypes {
    INITIALIZE_REVIEW_SUCCESS = 'INITIALIZE_REVIEW_SUCCESS',
    INITIALIZE_REVIEW_FAILED = 'INITIALIZE_REVIEW_FAILED',
    CREATE_ISSUE = 'CREATE_ISSUE',
    START_ISSUE = 'START_ISSUE',
    FINISH_ISSUE_SUCCESS = 'FINISH_ISSUE_SUCCESS',
    FINISH_ISSUE_FAILED = 'FINISH_ISSUE_FAILED',
    CANCEL_ISSUE = 'CANCEL_ISSUE',
    CREATE_ISSUE_SUCCESS = 'CREATE_ISSUE_SUCCESS',
    CREATE_ISSUE_FAILED = 'CREATE_ISSUE_FAILED',
    // COMMENT_ISSUE = 'COMMENT_ISSUE',
    COMMENT_ISSUE_SUCCESS = 'COMMENT_ISSUE_SUCCESS',
    COMMENT_ISSUE_FAILED = 'COMMENT_ISSUE_FAILED',
    // EDIT_ISSUE_COMMENT = 'EDIT_ISSUE_COMMENT',
    EDIT_ISSUE_COMMENT_SUCCESS = 'EDIT_ISSUE_COMMENT_SUCCESS',
    EDIT_ISSUE_COMMENT_FAILED = 'EDIT_ISSUE_COMMENT_FAILED',
    // DELETE_ISSUE_COMMENT = 'DELETE_ISSUE_COMMENT',
    DELETE_ISSUE_COMMENT_SUCCESS = 'DELETE_ISSUE_COMMENT_SUCCESS',
    DELETE_ISSUE_COMMENT_FAILED = 'DELETE_ISSUE_COMMENT_FAILED',
}

export const reviewActions = {
    initializeReviewSuccess: (reviewInstance: any) =>
        createAction(ReviewActionTypes.INITIALIZE_REVIEW_SUCCESS, { reviewInstance }),
    initializeReviewFailed: (error: any) => createAction(ReviewActionTypes.INITIALIZE_REVIEW_FAILED, { error }),
    createIssue: () => createAction(ReviewActionTypes.CREATE_ISSUE, {}),
    startIssue: (ROI: number[]) => createAction(ReviewActionTypes.START_ISSUE, { ROI }),
    finishIssueSuccess: () => createAction(ReviewActionTypes.FINISH_ISSUE_SUCCESS, {}),
    finishIssueFailed: (error: any) => createAction(ReviewActionTypes.FINISH_ISSUE_FAILED, { error }),
    cancelIssue: () => createAction(ReviewActionTypes.CANCEL_ISSUE),
    createIssueSuccess: (issues: any[]) => createAction(ReviewActionTypes.CREATE_ISSUE_SUCCESS, { issues }),
    createIssueFailed: (error: any) => createAction(ReviewActionTypes.CREATE_ISSUE_FAILED, { error }),
    commentIssueSuccess: (issues: any[]) => createAction(ReviewActionTypes.COMMENT_ISSUE_SUCCESS, { issues }),
    commentIssueFailed: (error: any) => createAction(ReviewActionTypes.COMMENT_ISSUE_FAILED, { error }),
    editIssueCommitSuccess: (issues: any[]) => createAction(ReviewActionTypes.EDIT_ISSUE_COMMENT_SUCCESS, { issues }),
    editIssueCommitFailed: (error: any) => createAction(ReviewActionTypes.EDIT_ISSUE_COMMENT_FAILED, { error }),
    deleteIssueCommentSuccess: (issues: any[]) =>
        createAction(ReviewActionTypes.DELETE_ISSUE_COMMENT_SUCCESS, { issues }),
    deleteIssueCommentFailed: (error: any) => createAction(ReviewActionTypes.DELETE_ISSUE_COMMENT_FAILED, { error }),
};

export type ReviewActions = ActionUnion<typeof reviewActions>;

export const initializeReviewAsync = (): ThunkAction => async (dispatch, getState) => {
    try {
        const state = getState();
        const jobInstance = state.annotation.job.instance;
        const reviews = await jobInstance.reviews();
        const count = reviews.length;
        let reviewInstance = null;
        if (count && reviews[count - 1].id < 0) {
            reviewInstance = reviews[count - 1];
        } else {
            reviewInstance = new cvat.classes.Review({ job: jobInstance.id });
        }

        dispatch(reviewActions.initializeReviewSuccess(reviewInstance));
    } catch (error) {
        dispatch(reviewActions.initializeReviewFailed(error));
    }
};

export const finishIssueAsync = (message: string): ThunkAction => async (dispatch, getState) => {
    const state = getState();
    const {
        annotation: {
            job: { instance: jobInstance },
            player: {
                frame: { number: frameNumber },
            },
        },
        review: { activeReview, newIssueROI },
    } = state;

    try {
        await activeReview.openIssue(jobInstance.id, frameNumber, newIssueROI, message);
        await activeReview.toLocalStorage(jobInstance.id);
        dispatch(reviewActions.finishIssueSuccess());
    } catch (error) {
        dispatch(reviewActions.finishIssueFailed(error));
    }
};
