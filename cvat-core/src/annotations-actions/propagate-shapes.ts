// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { range } from 'lodash';

import ObjectState from '../object-state';
import { Job, Task } from '../session';
import { SerializedShape } from '../server-response-types';
import { propagateShapes } from '../object-utils';
import { ObjectType } from '../enums';

import { ActionParameterType, ActionParameters } from './base-action';
import { BaseCollectionAction, CollectionActionInput, CollectionActionOutput } from './base-collection-action';

export class PropagateShapes extends BaseCollectionAction {
    #instance: Task | Job;
    #targetFrame: number;

    public async init(instance: Job | Task, parameters): Promise<void> {
        this.#instance = instance;
        this.#targetFrame = parameters['Target frame'];
    }

    public async destroy(): Promise<void> {
        // nothing to destroy
    }

    public async run(input: CollectionActionInput): Promise<CollectionActionOutput> {
        const { collection, frameData: { number } } = input;
        if (number === this.#targetFrame) {
            return {
                created: { shapes: [], tags: [], tracks: [] },
                deleted: { shapes: [], tags: [], tracks: [] },
            };
        }

        const frameNumbers = this.#instance instanceof Job ?
            await this.#instance.frames.frameNumbers() : range(0, this.#instance.size);
        const propagatedShapes = propagateShapes<SerializedShape>(
            collection.shapes, number, this.#targetFrame, frameNumbers,
        );

        return {
            created: { shapes: propagatedShapes, tags: [], tracks: [] },
            deleted: { shapes: [], tags: [], tracks: [] },
        };
    }

    public applyFilter(input: CollectionActionInput): CollectionActionInput['collection'] {
        return {
            shapes: input.collection.shapes.filter((shape) => shape.frame === input.frameData.number),
            tags: [],
            tracks: [],
        };
    }

    public isApplicableForObject(objectState: ObjectState): boolean {
        return objectState.objectType === ObjectType.SHAPE;
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
