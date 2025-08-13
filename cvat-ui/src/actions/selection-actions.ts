// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { SelectedResourceType } from 'reducers';
import { ActionUnion, createAction } from 'utils/redux';

export enum SelectionActionsTypes {
    DESELECT_RESOURCES = 'DESELECT_RESOURCES',
    SELECT_RESOURCES = 'SELECT_RESOURCES',
    CLEAR_SELECTED_RESOURCES = 'CLEAR_SELECTED_RESOURCES',
    SET_SELECTION_RESOURCE_TYPE = 'SET_SELECTION_RESOURCE_TYPE',
}

export const selectionActions = {
    deselectResources: (resourceIds: (number | string)[], resourceType: SelectedResourceType) => createAction(
        SelectionActionsTypes.DESELECT_RESOURCES, { resourceIds, resourceType }),
    selectResources: (resourceIds: (number | string)[], resourceType: SelectedResourceType) => createAction(
        SelectionActionsTypes.SELECT_RESOURCES, { resourceIds, resourceType }),
    clearSelectedResources: () => createAction(
        SelectionActionsTypes.CLEAR_SELECTED_RESOURCES),
};

export type SelectionActions = ActionUnion<typeof selectionActions>;
