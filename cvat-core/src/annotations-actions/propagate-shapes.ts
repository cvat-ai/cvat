// Copyright (C) 2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { range } from 'lodash';

import { Job, Task } from '../session';
import { SerializedShape } from '../server-response-types';
import { propagateShapes } from '../object-utils';

import { ActionParameterType, ActionParameters } from './base-action';
import { BaseShapesAction, ShapesActionInput, ShapesActionOutput } from './base-shapes-action';

export class PropagateShapes extends BaseShapesAction {
    #instance: Task | Job;
    #targetFrame: number;

    public async init(instance: Job | Task, parameters): Promise<void> {
        this.#instance = instance;
        this.#targetFrame = parameters['Target frame'];
    }

    public async destroy(): Promise<void> {
        // nothing to destroy
    }

    public async run(
        { collection: { shapes }, frameData: { number } }: ShapesActionInput,
    ): Promise<ShapesActionOutput> {
        if (number === this.#targetFrame) {
            return { collection: { shapes } };
        }

        const frameNumbers = this.#instance instanceof Job ? await this.#instance.frames.frameNumbers() : range(0, this.#instance.size);
        const propagatedShapes = propagateShapes<SerializedShape>(shapes, number, this.#targetFrame, frameNumbers);
        return { collection: { shapes: [...shapes, ...propagatedShapes] } };
    }

    public get name(): string {
        return 'Propagate shapes';
    }

    public get parameters(): ActionParameters | null {
        return {
            'Target frame': {
                type: ActionParameterType.NUMBER,
                values: ({ instance }) => {
                    if (instance instanceof Job) {
                        return [instance.startFrame, instance.stopFrame, 1].map((val) => val.toString());
                    }
                    return [0, instance.size - 1, 1].map((val) => val.toString());
                },
                defaultValue: ({ instance }) => {
                    if (instance instanceof Job) {
                        return instance.stopFrame.toString();
                    }
                    return (instance.size - 1).toString();
                },
            },
        };
    }
}
