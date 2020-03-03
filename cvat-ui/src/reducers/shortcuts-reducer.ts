import { ShortcutsActions, ShortcutsActionsTypes } from 'actions/shortcuts-actions';
import { ShortcutsState } from './interfaces';

const defaultState: ShortcutsState = {
    visibleShortcutsHelp: false,
};

export default (state = defaultState, action: ShortcutsActions): ShortcutsState => {
    switch (action.type) {
        case ShortcutsActionsTypes.SWITCH_SHORTCUT_DIALOG: {
            return {
                ...state,
                visibleShortcutsHelp: !state.visibleShortcutsHelp,
            };
        }
        default: {
            return state;
        }
    }
};
