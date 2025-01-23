// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { SerializedCollection } from 'server-response-types';
import ObjectState from '../object-state';
import { Job, Task } from '../session';

export enum ActionParameterType {
    SELECT = 'select',
    NUMBER = 'number',
    CHECKBOX = 'checkbox',
}

// For SELECT values should be a list of possible options
// For NUMBER values should be a list with [min, max, step],
// or a callback ({ instance }: { instance: Job | Task }) => [min, max, step]
export type ActionParameters = Record<string, {
    type: ActionParameterType;
    values: string[] | (({ instance }: { instance: Job | Task }) => string[]);
    defaultValue: string | (({ instance }: { instance: Job | Task }) => string);
}>;

export abstract class BaseAction {
    public abstract init(sessionInstance: Job | Task, parameters: Record<string, string | number>): Promise<void>;
    public abstract destroy(): Promise<void>;
    public abstract run(input: unknown): Promise<unknown>;
    public abstract applyFilter(input: unknown): unknown;
    public abstract isApplicableForObject(objectState: ObjectState): boolean;

    public abstract get name(): string;
    public abstract get parameters(): ActionParameters | null;
}

export function prepareActionParameters(declared: ActionParameters, defined: object): Record<string, string | number> {
    if (!declared) {
        return {};
    }

    return Object.entries(declared).reduce((acc, [name, { type, defaultValue }]) => {
        if (type === ActionParameterType.NUMBER) {
            acc[name] = +(Object.hasOwn(defined, name) ? defined[name] : defaultValue);
        } else {
            acc[name] = (Object.hasOwn(defined, name) ? defined[name] : defaultValue);
        }
        return acc;
    }, {} as Record<string, string | number>);
}

export function validateClientIDs(collection: Partial<SerializedCollection>) {
    [].concat(
        collection.shapes ?? [],
        collection.tracks ?? [],
        collection.tags ?? [],
    ).forEach((object) => {
        // clientID is required to correct collection filtering and committing in annotations actions logic
        if (typeof object.clientID !== 'number') {
            throw new Error('ClientID is undefined when running annotations action, but required');
        }
    });
}
