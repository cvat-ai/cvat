// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { KeyMapItem } from 'utils/mousetrap-react';
import { ActionUnion, createAction } from 'utils/redux';

export enum ShortcutsActionsTypes {
    SWITCH_SHORTCUT_DIALOG = 'SWITCH_SHORTCUT_DIALOG',
    REGISTER_SHORTCUT = 'REGISTER_SHORTCUT',
    UPDATE_SEQUNCE = 'UPDATE_SEQUNCE',
}

export const shortcutsActions = {
    switchShortcutsModalVisible: (visible: boolean) => (
        createAction(ShortcutsActionsTypes.SWITCH_SHORTCUT_DIALOG, { visible })
    ),
    registerShortcuts: (shortcuts: Record<string, KeyMapItem>) => (
        createAction(ShortcutsActionsTypes.REGISTER_SHORTCUT, { shortcuts })
    ),
    updateSequence: (keyMapId: string, updatedSequence: string[]) => (
        createAction(ShortcutsActionsTypes.UPDATE_SEQUNCE, { keyMapId, updatedSequence })
    ),
};

export type ShortcutsActions = ActionUnion<typeof shortcutsActions>;
