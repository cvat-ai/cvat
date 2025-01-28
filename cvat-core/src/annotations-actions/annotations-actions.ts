// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import ObjectState from '../object-state';
import { ArgumentError } from '../exceptions';
import { Job, Task } from '../session';
import { BaseAction } from './base-action';
import {
    BaseShapesAction, run as runShapesAction, call as callShapesAction,
} from './base-shapes-action';
import {
    BaseCollectionAction, run as runCollectionAction, call as callCollectionAction,
} from './base-collection-action';

import { RemoveFilteredShapes } from './remove-filtered-shapes';
import { PropagateShapes } from './propagate-shapes';

const registeredActions: BaseAction[] = [];

export async function listActions(): Promise<typeof registeredActions> {
    return [...registeredActions];
}

export async function registerAction(action: BaseAction): Promise<void> {
    if (!(action instanceof BaseAction)) {
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
    filters: object[],
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

    return Promise.resolve();
}

export async function callAction(
    instance: Job | Task,
    action: BaseAction,
    actionParameters: Record<string, string>,
    frame: number,
    states: ObjectState[],
    onProgress: (message: string, progress: number) => void,
    cancelled: () => boolean,
): Promise<void> {
    if (action instanceof BaseShapesAction) {
        return callShapesAction(
            instance,
            action,
            actionParameters,
            frame,
            states,
            onProgress,
            cancelled,
        );
    }

    if (action instanceof BaseCollectionAction) {
        return callCollectionAction(
            instance,
            action,
            actionParameters,
            frame,
            states,
            onProgress,
            cancelled,
        );
    }

    return Promise.resolve();
}
