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

    public applyFilter(input: ShapesActionInput): {
        filtered: ShapesActionInput['collection'];
        ignored: ShapesActionInput['collection'];
    } {
        const { collection } = input;
        return {
            filtered: { shapes: collection.shapes },
            ignored: { shapes: [], },
        };
    }

    public get name(): string {
        return 'Remove filtered shapes';
    }

    public get parameters(): ActionParameters | null {
        return null;
    }
}
