import { ActionUnion, createAction } from 'utils/redux';

export enum ShortcutsActionsTypes {
    SHOW_SHORTCUTS_HELP = 'SHOW_SHORTCUTS_HELP',
    HIDE_SHORTCUTS_HELP = 'HIDE_SHORTCUTS_HELP',
}

export const shortcutsActions = {
    showShortcutsHelp: () => createAction(ShortcutsActionsTypes.SHOW_SHORTCUTS_HELP),
    hideShortcutsHelp: () => createAction(ShortcutsActionsTypes.HIDE_SHORTCUTS_HELP),
};

export type ShortcutsActions = ActionUnion<typeof shortcutsActions>;
