import { AnyAction } from 'redux';

import { ShareActionTypes } from '../actions/share-actions';
import { ShareState, ShareFileInfo, ShareItem } from './interfaces';

const defaultState: ShareState = {
    tree: {
        name: '/',
        type: 'DIR',
        children: [],
    },
    error: null,
};

export default function (state = defaultState, action: AnyAction): ShareState {
    switch (action.type) {
        case ShareActionTypes.LOAD_SHARE_DATA: {
            return {
                ...state,
                error: null,
            };
        }
        case ShareActionTypes.LOAD_SHARE_DATA_SUCCESS: {
            const { values } = action.payload;
            const { directory } = action.payload;

            let dir = state.tree;
            for (const dirName of directory.split('/')) {
                if (dirName && dir.children) {
                    [dir] = dir.children.filter((child): boolean => child.name === dirName);
                }
            }

            dir.children = (values as ShareFileInfo[]).map((value): ShareItem => (
                value.type === 'DIR' ? {
                    ...value,
                    children: [],
                } : {
                    ...value,
                }
            ));

            return {
                ...state,
            };
        }
        case ShareActionTypes.LOAD_SHARE_DATA_FAILED: {
            const { error } = action.payload;

            return {
                ...state,
                error,
            };
        }
        default:
            return {
                ...state,
            };
    }
}
