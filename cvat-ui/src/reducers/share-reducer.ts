// Copyright (C) 2020-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

import { BoundariesActionTypes, BoundariesActions } from 'actions/boundaries-actions';
import { ShareActionTypes, ShareActions } from 'actions/share-actions';
import { AuthActionTypes, AuthActions } from 'actions/auth-actions';
import { ShareState, ShareFileInfo, ShareItem } from '.';

const defaultState: ShareState = {
    initialized: false,
    fetching: false,
    root: {
        name: '',
        type: 'DIR',
        mime_type: '',
        children: [],
    },
};

export default function (
    state: ShareState = defaultState,
    action: ShareActions | AuthActions | BoundariesActions,
): ShareState {
    switch (action.type) {
        case ShareActionTypes.LOAD_SHARE_DATA: {
            return {
                ...state,
                fetching: true,
            };
        }
        case ShareActionTypes.LOAD_SHARE_DATA_SUCCESS: {
            const { values } = action.payload;
            const { directory } = action.payload;

            // Find directory item in storage
            let dir = state.root;
            for (const dirName of directory.split('/')) {
                if (dirName) {
                    [dir] = dir.children.filter((child): boolean => child.name === dirName);
                }
            }

            // Update its children
            dir.children = (values as ShareFileInfo[]).map(
                (value): ShareItem => ({
                    ...value,
                    children: [],
                }),
            );

            return {
                ...state,

                // to correct work we destruct root element
                // to let know app that the structure has been updated
                root: { ...state.root },

                initialized: state.initialized || directory === '/',
                fetching: false,
            };
        }
        case ShareActionTypes.LOAD_SHARE_DATA_FAILED: {
            return {
                ...state,
                fetching: false,
                initialized: true,
            };
        }
        case BoundariesActionTypes.RESET_AFTER_ERROR:
        case AuthActionTypes.LOGOUT_SUCCESS: {
            return { ...defaultState };
        }
        default:
            return state;
    }
}
