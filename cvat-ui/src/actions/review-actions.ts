// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { ActionUnion, createAction, ThunkAction } from 'utils/redux';
import {
    getCore, Issue, ObjectType, ObjectState,
} from 'cvat-core-wrapper';
import { NewIssueSource } from 'reducers';
import { saveAnnotationsAsync } from './annotation-actions';

const cvat = getCore();

export enum ReviewActionTypes {
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
    SELECT_ISSUE = 'SELECT_ISSUE',
    HIGHLIGHT_ISSUE = 'HIGHLIGHT_ISSUE',
    MOVE_ISSUE = 'MOVE_ISSUE',
    MOVE_ISSUE_SUCCESS = 'MOVE_ISSUE_SUCCESS',
    MOVE_ISSUE_FAILED = 'MOVE_ISSUE_FAILED',
    MOVE_DRAFT_ISSUE = 'MOVE_DRAFT_ISSUE',
}

export const reviewActions = {
    createIssue: () => createAction(ReviewActionTypes.CREATE_ISSUE, {}),
    startIssue: (position: number[], source = NewIssueSource.ISSUE_TOOL, objectClientID: number | null = null) => (
        createAction(ReviewActionTypes.START_ISSUE, {
            position: cvat.classes.Issue.hull(position), source, objectClientID,
        })
    ),
    selectIssue: (issueId: number | null) => createAction(ReviewActionTypes.SELECT_ISSUE, { issueId }),
    highlightIssue: (issueId: number | null) => createAction(ReviewActionTypes.HIGHLIGHT_ISSUE, { issueId }),
    moveDraftIssue: (position: number[]) => createAction(ReviewActionTypes.MOVE_DRAFT_ISSUE, { position }),
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
    submitReview: (jobId: number) => createAction(ReviewActionTypes.SUBMIT_REVIEW, { jobId }),
    submitReviewSuccess: () => createAction(ReviewActionTypes.SUBMIT_REVIEW_SUCCESS),
    submitReviewFailed: (error: any, jobId: number) => (
        createAction(ReviewActionTypes.SUBMIT_REVIEW_FAILED, { error, jobId })
    ),
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

export const moveIssueAsync = (issue: Issue, position: number[]): ThunkAction => async (dispatch, getState) => {
    const job = getState().annotation.job.instance;
    dispatch(createAction(ReviewActionTypes.MOVE_ISSUE, { issueId: issue.id }));
    try {
        await issue.move(position);
        if (getState().annotation.job.instance === job) {
            dispatch(createAction(ReviewActionTypes.MOVE_ISSUE_SUCCESS));
        }
    } catch (error) {
        if (getState().annotation.job.instance === job) {
            dispatch(createAction(ReviewActionTypes.MOVE_ISSUE_FAILED, { error }));
        }
    }
};

export interface NewIssueContext {
    objectClientID?: number | null;
    startFrame?: number;
    endFrame?: number;
}

export const finishIssueAsync = (message: string, context: NewIssueContext = {}): ThunkAction => async (
    dispatch, getState,
) => {
    const state = getState();
    const {
        annotation: {
            player: {
                frame: { number: frameNumber },
            },
            job: {
                instance: jobInstance,
            },
        },
        review: {
            newIssue: {
                position: newIssuePosition,
                objectClientID: defaultObjectClientID,
            },
        },
    } = state;

    try {
        const objectClientID = context.objectClientID === undefined ? defaultObjectClientID : context.objectClientID;
        let object: ObjectState | null = null;
        if (objectClientID !== null) {
            const findObject = async (): Promise<ObjectState | undefined> => (
                await jobInstance.annotations.get(frameNumber, false, [])
            )
                .find((candidate) => candidate.clientID === objectClientID && !candidate.isGroundTruth &&
                    [ObjectType.SHAPE, ObjectType.TRACK].includes(candidate.objectType));
            object = await findObject();
            if (!object) throw new Error('The linked annotation is no longer available');
            if (object.serverID === null) {
                if (getState().annotation.job.instance !== jobInstance) return;
                await dispatch(saveAnnotationsAsync());
                object = await findObject();
            }
            if (!Number.isInteger(object?.serverID)) throw new Error('Could not save the linked annotation');
        }
        let objectType: ObjectType.SHAPE | ObjectType.TRACK | null = null;
        if (object) objectType = object.objectType === ObjectType.TRACK ? ObjectType.TRACK : ObjectType.SHAPE;
        const issue = new cvat.classes.Issue({
            job: jobInstance.id,
            frame: context.startFrame ?? frameNumber,
            end_frame: context.endFrame ?? null,
            object_id: object?.serverID ?? null,
            object_type: objectType,
            position: newIssuePosition,
        });

        const savedIssue = await jobInstance.openIssue(issue, message);
        if (getState().annotation.job.instance === jobInstance) {
            dispatch(reviewActions.finishIssueSuccess(getState().annotation.player.frame.number, savedIssue));
        }
    } catch (error) {
        if (getState().annotation.job.instance === jobInstance) dispatch(reviewActions.finishIssueFailed(error));
    }
};

export const commentIssueAsync = (id: number, message: string): ThunkAction => async (dispatch, getState) => {
    const state = getState();
    const {
        auth: { user },
        review: { frameIssues },
    } = state;

    try {
        dispatch(reviewActions.commentIssue(id));
        const [issue] = frameIssues.filter((_issue: any): boolean => _issue.id === id);
        await issue.comment({
            message,
            owner: user,
        });

        dispatch(reviewActions.commentIssueSuccess());
    } catch (error) {
        dispatch(reviewActions.commentIssueFailed(error));
    }
};

export const resolveIssueAsync = (id: number): ThunkAction => async (dispatch, getState) => {
    const state = getState();
    const {
        auth: { user },
        review: { frameIssues },
    } = state;

    try {
        dispatch(reviewActions.resolveIssue(id));
        const [issue] = frameIssues.filter((_issue: any): boolean => _issue.id === id);
        await issue.resolve(user);
        dispatch(reviewActions.resolveIssueSuccess());
    } catch (error) {
        dispatch(reviewActions.resolveIssueFailed(error));
    }
};

export const reopenIssueAsync = (id: number): ThunkAction => async (dispatch, getState) => {
    const state = getState();
    const {
        auth: { user },
        review: { frameIssues },
    } = state;

    try {
        dispatch(reviewActions.reopenIssue(id));
        const [issue] = frameIssues.filter((_issue: any): boolean => _issue.id === id);
        await issue.reopen(user);
        dispatch(reviewActions.reopenIssueSuccess());
    } catch (error) {
        dispatch(reviewActions.reopenIssueFailed(error));
    }
};

export const deleteIssueAsync = (id: number): ThunkAction => async (dispatch, getState) => {
    const state = getState();
    const {
        review: { frameIssues },
        annotation: {
            player: {
                frame: { number: frameNumber },
            },
        },
    } = state;

    try {
        const [issue] = frameIssues.filter((_issue: any): boolean => _issue.id === id);
        await issue.delete();
        dispatch(reviewActions.removeIssueSuccess(id, frameNumber));
    } catch (error) {
        dispatch(reviewActions.removeIssueFailed(error));
    }
};
