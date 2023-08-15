// Copyright (C) 2022 Sportradar
//
// SPDX-License-Identifier: MIT

import {JobPreviewActions, JobPreviewActionTypes} from 'actions/jobPreview-actions';
import {JobPreviewState} from '.';

const defaultState: JobPreviewState = {
    showed: false,
};

export default function (state = defaultState, action: JobPreviewActions): JobPreviewState {
    switch (action.type) {
        case JobPreviewActionTypes.OPEN_JOB_PREVIEW_MODAL: {
            return {
                ...state,
                showed: true,
            };
        }
        case JobPreviewActionTypes.CLOSE_JOB_PREVIEW_MODAL: {
            return {
                ...state,
                showed: false,
            };
        }
        default: {
            return state;
        }
    }
}
