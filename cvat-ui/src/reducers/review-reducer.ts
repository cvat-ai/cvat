// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import config from 'config';
import { AnnotationActionTypes } from 'actions/annotation-actions';
import { ReviewActionTypes } from 'actions/review-actions';
import { AuthActionTypes } from 'actions/auth-actions';
import { Action } from 'redux';
import {
    QualityConflict, DimensionType, Issue, Job,
} from 'cvat-core-wrapper';
import { ActionWithPayload } from 'utils/redux';
import type { ReviewActions } from 'actions/review-actions';
import { isQuickIssuePresetMessage } from 'utils/review/quick-issues';
import { ReviewState } from '.';

const defaultState: ReviewState = {
    activeIssueId: null,
    highlightedIssueId: null,
    issues: [],
    latestComments: [],
    frameIssues: [],
    conflicts: [],
    frameConflicts: [],
    newIssue: {
        position: null,
        source: null,
        view: null,
    },
    issuesHidden: false,
    issuesResolvedHidden: false,
    fetching: {
        jobId: null,
        issueId: null,
    },
};

type ReviewAction = ReviewActions |
    ActionWithPayload<AnnotationActionTypes.GET_JOB_SUCCESS, {
        job: Job;
        frameNumber: number;
        issues: Issue[];
        conflicts: QualityConflict[];
    }> |
    ActionWithPayload<AnnotationActionTypes.CHANGE_FRAME_SUCCESS, { number: number }> |
    Action<AnnotationActionTypes.CHANGE_FRAME | AnnotationActionTypes.DELETE_FRAME_SUCCESS |
    AnnotationActionTypes.CLOSE_JOB | AuthActionTypes.LOGOUT_SUCCESS>;

function reviewOnFrame(frame: number, issues: Issue[], conflicts: QualityConflict[]): Pick<
    ReviewState, 'frameIssues' | 'frameConflicts'
> {
    return {
        frameIssues: issues.filter((issue) => issue.frame === frame),
        frameConflicts: conflicts.filter((conflict) => conflict.frame === frame),
    };
}

export default function (state: ReviewState = defaultState, action: ReviewAction): ReviewState {
    switch (action.type) {
        case ReviewActionTypes.SELECT_ISSUE:
            return { ...state, activeIssueId: action.payload.issueId };
        case ReviewActionTypes.HIGHLIGHT_ISSUE:
            return { ...state, highlightedIssueId: action.payload.issueId };
        case ReviewActionTypes.MOVE_DRAFT_ISSUE:
            return { ...state, newIssue: { ...state.newIssue, position: action.payload.position } };
        case AnnotationActionTypes.GET_JOB_SUCCESS: {
            const { job } = action.payload;
            if (job.dimension === DimensionType.DIMENSION_1D) {
                // review mode not supported for audio tasks
                return state;
            }

            const { issues, conflicts, frameNumber } = action.payload;
            return {
                ...state,
                issues,
                conflicts,
                ...reviewOnFrame(frameNumber, issues, conflicts),
            };
        }
        case AnnotationActionTypes.CHANGE_FRAME:
        case ReviewActionTypes.CANCEL_ISSUE:
        case AnnotationActionTypes.DELETE_FRAME_SUCCESS: {
            return {
                ...state,
                activeIssueId: null,
                highlightedIssueId: null,
                newIssue: defaultState.newIssue,
            };
        }
        case ReviewActionTypes.SUBMIT_REVIEW: {
            const { jobId } = action.payload;
            return {
                ...state,
                fetching: {
                    ...state.fetching,
                    jobId,
                },
            };
        }
        case ReviewActionTypes.SUBMIT_REVIEW_SUCCESS:
        case ReviewActionTypes.SUBMIT_REVIEW_FAILED: {
            return {
                ...state,
                fetching: {
                    ...state.fetching,
                    jobId: null,
                },
            };
        }
        case AnnotationActionTypes.CHANGE_FRAME_SUCCESS: {
            const { number: frame } = action.payload;
            return {
                ...state,
                ...reviewOnFrame(frame, state.issues, state.conflicts),
            };
        }
        case ReviewActionTypes.START_ISSUE:
            return {
                ...state,
                activeIssueId: null,
                highlightedIssueId: null,
                newIssue: action.payload,
            };
        case ReviewActionTypes.FINISH_ISSUE_SUCCESS: {
            const { frame, issue, draft } = action.payload;
            const issues = [...state.issues, issue];
            const message = issue.comments[0]?.message;
            const latestComments = message && !isQuickIssuePresetMessage(message) &&
                !state.latestComments.includes(message) ?
                [...state.latestComments, message].slice(-config.LATEST_COMMENTS_SHOWN_QUICK_ISSUE) :
                state.latestComments;

            return {
                ...state,
                ...reviewOnFrame(frame, issues, state.conflicts),
                issues,
                latestComments,
                newIssue: state.newIssue === draft ? defaultState.newIssue : state.newIssue,
            };
        }
        case ReviewActionTypes.COMMENT_ISSUE:
        case ReviewActionTypes.MOVE_ISSUE:
        case ReviewActionTypes.RESOLVE_ISSUE:
        case ReviewActionTypes.REOPEN_ISSUE: {
            const { issueId } = action.payload;
            return {
                ...state,
                fetching: {
                    ...state.fetching,
                    issueId,
                },
            };
        }
        case ReviewActionTypes.COMMENT_ISSUE_FAILED:
        case ReviewActionTypes.MOVE_ISSUE_FAILED:
        case ReviewActionTypes.RESOLVE_ISSUE_FAILED:
        case ReviewActionTypes.REOPEN_ISSUE_FAILED: {
            return {
                ...state,
                fetching: {
                    ...state.fetching,
                    issueId: null,
                },
            };
        }
        case ReviewActionTypes.RESOLVE_ISSUE_SUCCESS:
        case ReviewActionTypes.MOVE_ISSUE_SUCCESS:
        case ReviewActionTypes.REOPEN_ISSUE_SUCCESS:
        case ReviewActionTypes.COMMENT_ISSUE_SUCCESS: {
            const { issues, frameIssues } = state;

            return {
                ...state,
                issues: [...issues],
                frameIssues: [...frameIssues],
                fetching: {
                    ...state.fetching,
                    issueId: null,
                },
            };
        }
        case ReviewActionTypes.SWITCH_ISSUES_HIDDEN_FLAG: {
            const { hidden } = action.payload;
            return {
                ...state,
                issuesHidden: hidden,
            };
        }
        case ReviewActionTypes.SWITCH_RESOLVED_ISSUES_HIDDEN_FLAG: {
            const { hidden } = action.payload;
            return {
                ...state,
                issuesResolvedHidden: hidden,
            };
        }
        case ReviewActionTypes.REMOVE_ISSUE_SUCCESS: {
            const { issueId, frame } = action.payload;
            const issues = state.issues.filter((issue) => issue.id !== issueId);
            return {
                ...state,
                activeIssueId: state.activeIssueId === issueId ? null : state.activeIssueId,
                issues,
                ...reviewOnFrame(frame, issues, state.conflicts),
            };
        }
        case AnnotationActionTypes.CLOSE_JOB:
        case AuthActionTypes.LOGOUT_SUCCESS: {
            return defaultState;
        }
        default:
            return state;
    }
}
