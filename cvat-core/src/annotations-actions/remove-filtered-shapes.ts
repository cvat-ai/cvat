// Copyright (C) 2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { BaseShapesAction, ShapesActionInput, ShapesActionOutput } from './base-shapes-action';
import { ActionParameters } from './base-action';

export class RemoveFilteredShapes extends BaseShapesAction {
    public async init(): Promise<void> {
        // nothing to init
    }

    public async destroy(): Promise<void> {
        // nothing to destroy
    }

    public async run(): Promise<ShapesActionOutput> {
        return { collection: { shapes: [] } };
    }

    public applyFilter(input: ShapesActionInput): ShapesActionInput['collection'] {
        const { collection } = input;
        return collection;
    }

    public get name(): string {
        return 'Remove filtered shapes';
    }

    public get parameters(): ActionParameters | null {
        return null;
    }
}
