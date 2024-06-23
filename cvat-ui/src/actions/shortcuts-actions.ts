// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { KeyMapItem } from 'utils/mousetrap-react';
import { ActionUnion, createAction } from 'utils/redux';

export enum ShortcutsActionsTypes {
    SWITCH_SHORTCUT_DIALOG = 'SWITCH_SHORTCUT_DIALOG',
    REGISTER_SHORTCUTS = 'REGISTER_SHORTCUTS',
}

export const shortcutsActions = {
    switchShortcutsModalVisible: (visible: boolean) => (
        createAction(ShortcutsActionsTypes.SWITCH_SHORTCUT_DIALOG, { visible })
    ),
    registerShortcuts: (shortcuts: Record<string, KeyMapItem>) => (
        createAction(ShortcutsActionsTypes.REGISTER_SHORTCUTS, { shortcuts })
    ),
};

export type ShortcutsActions = ActionUnion<typeof shortcutsActions>;
