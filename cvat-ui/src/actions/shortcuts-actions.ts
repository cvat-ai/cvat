// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT
import { ActionUnion, createAction } from 'utils/redux';

export enum ShortcutsActionsTypes {
    SWITCH_SHORTCUT_DIALOG = 'SWITCH_SHORTCUT_DIALOG',
}

export const shortcutsActions = {
    switchShortcutsDialog: () => createAction(ShortcutsActionsTypes.SWITCH_SHORTCUT_DIALOG),
};

export type ShortcutsActions = ActionUnion<typeof shortcutsActions>;
