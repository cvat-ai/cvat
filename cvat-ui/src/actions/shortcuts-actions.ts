// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { getCVATStore } from 'cvat-store';
import { KeyMapItem } from 'utils/mousetrap-react';
import { ActionUnion, createAction } from 'utils/redux';

export enum ShortcutsActionsTypes {
    SWITCH_SHORTCUT_DIALOG = 'SWITCH_SHORTCUT_DIALOG',
    UPDATE_SEQUNCE = 'UPDATE_SEQUNCE',
    REGISTER_SHORTCUTS = 'REGISTER_SHORTCUTS',
}

export const shortcutsActions = {
    switchShortcutsModalVisible: (visible: boolean) => (
        createAction(ShortcutsActionsTypes.SWITCH_SHORTCUT_DIALOG, { visible })
    ),
    registerShortcuts: (shortcuts: Record<string, KeyMapItem>) => (
        createAction(ShortcutsActionsTypes.REGISTER_SHORTCUTS, { shortcuts })
    ),
    updateSequence: (keyMapId: string, updatedSequence: string[]) => (
        createAction(ShortcutsActionsTypes.UPDATE_SEQUNCE, { keyMapId, updatedSequence })
    ),
};

export function registerComponentShortcuts(shortcuts: Record<string, KeyMapItem>): void {
    const store = getCVATStore();
    const { registerShortcuts } = shortcutsActions;
    store.dispatch(registerShortcuts(shortcuts));
}

export type ShortcutsActions = ActionUnion<typeof shortcutsActions>;
