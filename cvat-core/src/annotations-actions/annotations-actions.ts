// Copyright (C) 2023-2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { ArgumentError } from '../exceptions';
import { Job, Task } from '../session';
import { BaseAction } from './base-action';
import { BaseShapesAction, run as runShapesAction } from './base-shapes-action';
import { BaseCollectionAction, run as runCollectionAction } from './base-collection-action';

import { RemoveFilteredShapes } from './remove-filtered-shapes';
import { PropagateShapes } from './propagate-shapes';

const registeredActions: BaseAction[] = [];

export async function listActions(): Promise<typeof registeredActions> {
    return [...registeredActions];
}

export async function registerAction(action: BaseAction): Promise<void> {
    if (!(action instanceof BaseAction) ) {
        throw new ArgumentError('Provided action must inherit one of base classes');
    }

    const { name } = action;
    if (registeredActions.map((_action) => _action.name).includes(name)) {
        throw new ArgumentError(`Action name must be unique. Name "${name}" is already exists`);
    }

    registeredActions.push(action);
}

registerAction(new RemoveFilteredShapes());
registerAction(new PropagateShapes());

export async function runAction(
    instance: Job | Task,
    action: BaseAction,
    actionParameters: Record<string, string>,
    frameFrom: number,
    frameTo: number,
    filters: string[],
    onProgress: (message: string, progress: number) => void,
    cancelled: () => boolean,
): Promise<void> {
    if (action instanceof BaseShapesAction) {
        return runShapesAction(
            instance,
            action,
            actionParameters,
            frameFrom,
            frameTo,
            filters,
            onProgress,
            cancelled,
        );
    }

    if (action instanceof BaseCollectionAction) {
        return runCollectionAction(
            instance,
            action,
            actionParameters,
            frameFrom,
            filters,
            onProgress,
            cancelled,
        );
    }
}
