// Copyright (C) 2020-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

import config from 'config';
import { AnnotationActionTypes } from 'actions/annotation-actions';
import { ReviewActionTypes } from 'actions/review-actions';
import { AuthActionTypes } from 'actions/auth-actions';
import { QualityConflict } from 'cvat-core-wrapper';
import { ReviewState } from '.';

const defaultState: ReviewState = {
    issues: [],
    latestComments: [],
    frameIssues: [], // saved on the server and not saved on the server
    conflicts: [],
    frameConflicts: [],
    newIssuePosition: null,
    issuesHidden: false,
    issuesResolvedHidden: false,
    fetching: {
        jobId: null,
        issueId: null,
    },
};

export default function (state: ReviewState = defaultState, action: any): ReviewState {
    switch (action.type) {
        case AnnotationActionTypes.GET_JOB_SUCCESS: {
            const {
                issues,
                conflicts,
                frameData: { number: frame },
            } = action.payload;
            const frameIssues = issues.filter((issue: any): boolean => issue.frame === frame);
            const frameConflicts = conflicts.filter((conflict: QualityConflict): boolean => conflict.frame === frame);

            return {
                ...state,
                issues,
                frameIssues,
                conflicts,
                frameConflicts,
            };
        }
        case AnnotationActionTypes.CHANGE_FRAME: {
            return {
                ...state,
                newIssuePosition: null,
            };
        }
        case AnnotationActionTypes.DELETE_FRAME_SUCCESS: {
            return {
                ...state,
                newIssuePosition: null,
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
        case ReviewActionTypes.SUBMIT_REVIEW_SUCCESS: {
            return {
                ...state,
                fetching: {
                    ...state.fetching,
                    jobId: null,
                },
            };
        }
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
            let frameConflicts: QualityConflict[] = [];
            if (state.conflicts.length) {
                frameConflicts = state.conflicts.filter((conflict) => conflict.frame === frame);
            }

            return {
                ...state,
                frameIssues: state.issues.filter((issue: any): boolean => issue.frame === frame),
                frameConflicts,
            };
        }
        case ReviewActionTypes.START_ISSUE: {
            const { position } = action.payload;
            return {
                ...state,
                newIssuePosition: position,
            };
        }
        case ReviewActionTypes.FINISH_ISSUE_SUCCESS: {
            const { frame, issue } = action.payload;
            const issues = [...state.issues, issue];
            const frameIssues = issues.filter((_issue: any): boolean => _issue.frame === frame);

            return {
                ...state,
                latestComments: state.latestComments.includes(issue.comments[0].message) ?
                    state.latestComments :
                    Array.from(
                        new Set(
                            [...state.latestComments, issue.comments[0].message].filter(
                                (message: string): boolean => ![
                                    config.QUICK_ISSUE_INCORRECT_POSITION_TEXT,
                                    config.QUICK_ISSUE_INCORRECT_ATTRIBUTE_TEXT,
                                ].includes(message),
                            ),
                        ),
                    ).slice(-config.LATEST_COMMENTS_SHOWN_QUICK_ISSUE),
                frameIssues,
                issues,
                newIssuePosition: null,
            };
        }
        case ReviewActionTypes.CANCEL_ISSUE: {
            return {
                ...state,
                newIssuePosition: null,
            };
        }
        case ReviewActionTypes.COMMENT_ISSUE:
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
            const issues = state.issues.filter((issue: any) => issue.id !== issueId);
            const frameIssues = issues.filter((issue: any): boolean => issue.frame === frame);
            return {
                ...state,
                issues,
                frameIssues,
            };
        }
        case AnnotationActionTypes.CLOSE_JOB:
        case AuthActionTypes.LOGOUT_SUCCESS: {
            return defaultState;
        }
        default:
            return state;
    }

    return state;
}
