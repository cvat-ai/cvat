// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { ActionUnion, createAction } from 'utils/redux';

export enum NavigationActionTypes {
    CHANGE_LOCATION = 'CHANGE_LOCATION',
}

export const navigationActions = {
    changeLocation: (from: string, to: string) => createAction(
        NavigationActionTypes.CHANGE_LOCATION, { from, to },
    ),
};

export type NavigationActions = ActionUnion<typeof navigationActions>;
