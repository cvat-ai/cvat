import { AnyAction } from 'redux';

import { ShareActionTypes } from '../actions/share-actions';
import { AuthActionTypes } from '../actions/auth-actions';
import {
    ShareState,
    ShareFileInfo,
    ShareItem,
} from './interfaces';

const defaultState: ShareState = {
    root: {
        name: '',
        type: 'DIR',
        children: [],
    },
};

export default function (state = defaultState, action: AnyAction): ShareState {
    switch (action.type) {
        case ShareActionTypes.LOAD_SHARE_DATA_SUCCESS: {
            const { values } = action.payload;
            const { directory } = action.payload;

            // Find directory item in storage
            let dir = state.root;
            for (const dirName of directory.split('/')) {
                if (dirName) {
                    [dir] = dir.children.filter(
                        (child): boolean => child.name === dirName,
                    );
                }
            }

            // Update its children
            dir.children = (values as ShareFileInfo[])
                .map((value): ShareItem => ({
                    ...value,
                    children: [],
                }));

            return {
                ...state,
            };
        }
        case AuthActionTypes.LOGOUT_SUCCESS: {
            return {
                ...defaultState,
            };
        }
        default:
            return {
                ...state,
            };
    }
}
