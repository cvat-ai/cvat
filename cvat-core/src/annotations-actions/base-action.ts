// Copyright (C) 2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { Job, Task } from '../session';

export enum ActionParameterType {
    SELECT = 'select',
    NUMBER = 'number',
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

    public abstract get name(): string;
    public abstract get parameters(): ActionParameters | null;
}
