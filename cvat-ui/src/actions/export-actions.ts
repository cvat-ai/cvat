// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

import { ActionUnion, createAction } from 'utils/redux';

export enum ExportActionTypes {
    TOGGLE_EXPORT_MODAL_VISIBLE = 'TOGGLE_EXPORT_MODAL_VISIBLE',
}

export const exportActions = {
    toggleExportModalVisible: () => createAction(ExportActionTypes.TOGGLE_EXPORT_MODAL_VISIBLE),
};

export type ExportActions = ActionUnion<typeof exportActions>;
