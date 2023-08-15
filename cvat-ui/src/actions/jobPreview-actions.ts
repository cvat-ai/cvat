// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) 2022 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { ActionUnion } from 'utils/redux';

export enum JobPreviewActionTypes {
    OPEN_JOB_PREVIEW_MODAL = 'OPEN_JOB_PREVIEW_MODAL',
    CLOSE_JOB_PREVIEW_MODAL = 'CLOSE_JOB_PREVIEW_MODAL',
}

export const jobPreviewActions = {
    closePreviewModal: () => ({
        type: JobPreviewActionTypes.CLOSE_JOB_PREVIEW_MODAL,
    }),
    openPreviewModal: () => ({
        type: JobPreviewActionTypes.OPEN_JOB_PREVIEW_MODAL,
    }),

};

export type JobPreviewActions = ActionUnion<typeof jobPreviewActions>;
