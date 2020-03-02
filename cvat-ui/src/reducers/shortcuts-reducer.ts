
import { ShortcutsActions, ShortcutsActionsTypes } from 'actions/shortcuts-actions';
import { ShortcutsState } from './interfaces';

const defaultState: ShortcutsState = {
    visibleShortcutsHelp: false,
};

export default (state = defaultState, action: ShortcutsActions): ShortcutsState => {
    switch (action.type) {
        case ShortcutsActionsTypes.SHOW_SHORTCUTS_HELP: {
            return {
                ...state,
                visibleShortcutsHelp: true,
            };
        }
        case ShortcutsActionsTypes.HIDE_SHORTCUTS_HELP: {
            return {
                ...state,
                visibleShortcutsHelp: false,
            };
        }
        default: {
            return state;
        }
    }
};
