// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import { AnnotationActionTypes } from 'actions/annotation-actions';
import { ReviewActionTypes } from 'actions/review-actions';
import { ReviewState } from './interfaces';

const defaultState: ReviewState = {
    reviews: [], // saved on the server
    issues: [], // saved on the server
    frameIssues: [], // saved on the server and not saved on the server
    activeReview: null, // not saved on the server
    newIssueROI: null,
};

export default function (state: ReviewState = defaultState, action: any): ReviewState {
    switch (action.type) {
        case AnnotationActionTypes.GET_JOB_SUCCESS: {
            const {
                reviews,
                issues,
                frameData: { number: frame },
            } = action.payload;
            const combinedIssues = state.activeReview ? issues.concat(state.activeReview.issues) : issues;
            const frameIssues = combinedIssues.filter((issue: any): boolean => issue.frame === frame);
            return {
                ...state,
                reviews,
                issues,
                frameIssues,
            };
        }
        case AnnotationActionTypes.CHANGE_FRAME_SUCCESS: {
            const { number: frame } = action.payload;
            return {
                ...state,
                frameIssues: state.issues.filter((issue: any): boolean => issue.frame === frame),
            };
        }
        case ReviewActionTypes.INITIALIZE_REVIEW_SUCCESS: {
            const { reviewInstance, frame } = action.payload;
            const combinedIssues = state.issues.concat(reviewInstance.issues);
            const frameIssues = combinedIssues.filter((issue: any): boolean => issue.frame === frame);
            return {
                ...state,
                activeReview: reviewInstance,
                frameIssues,
            };
        }
        case ReviewActionTypes.START_ISSUE: {
            const { ROI } = action.payload;
            return {
                ...state,
                newIssueROI: ROI,
            };
        }
        case ReviewActionTypes.FINISH_ISSUE_SUCCESS: {
            const { frame } = action.payload;
            const combinedIssues = state.activeReview ? state.issues.concat(state.activeReview.issues) : state.issues;
            const frameIssues = combinedIssues.filter((issue: any): boolean => issue.frame === frame);

            return {
                ...state,
                frameIssues,
                newIssueROI: null,
            };
        }
        case ReviewActionTypes.CANCEL_ISSUE: {
            return {
                ...state,
                newIssueROI: null,
            };
        }
        default:
            return state;
    }

    return state;
}
