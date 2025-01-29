// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { throttle } from 'lodash';

import ObjectState from '../object-state';
import AnnotationsFilter from '../annotations-filter';
import { Job, Task } from '../session';
import { SerializedCollection, SerializedShape } from '../server-response-types';
import { EventScope, ObjectType } from '../enums';
import { getCollection } from '../annotations';
import { BaseAction, prepareActionParameters, validateClientIDs } from './base-action';

export interface ShapesActionInput {
    onProgress(message: string, percent: number): void;
    cancelled(): boolean;
    collection: Pick<SerializedCollection, 'shapes'>;
    frameData: {
        width: number;
        height: number;
        number: number;
    };
}

export interface ShapesActionOutput {
    created: ShapesActionInput['collection'];
    deleted: ShapesActionInput['collection'];
}

export abstract class BaseShapesAction extends BaseAction {
    public abstract run(input: ShapesActionInput): Promise<ShapesActionOutput>;
    public abstract applyFilter(
        input: Pick<ShapesActionInput, 'collection' | 'frameData'>
    ): ShapesActionInput['collection'];
}

export async function run(
    instance: Job | Task,
    action: BaseShapesAction,
    actionParameters: Record<string, string>,
    frameFrom: number,
    frameTo: number,
    filters: object[],
    onProgress: (message: string, progress: number) => void,
    cancelled: () => boolean,
): Promise<void> {
    const event = await instance.logger.log(EventScope.annotationsAction, {
        from: frameFrom,
        to: frameTo,
        name: action.name,
    }, true);

    const throttledOnProgress = throttle(onProgress, 100, { leading: true, trailing: true });
    const showMessageWithPause = async (message: string, progress: number, duration: number): Promise<void> => {
        // wrapper that gives a chance to abort action
        throttledOnProgress(message, progress);
        await new Promise((resolve) => setTimeout(resolve, duration));
    };

    try {
        await showMessageWithPause('Actions initialization', 0, 500);
        if (cancelled()) {
            return;
        }

        await action.init(instance, prepareActionParameters(action.parameters, actionParameters));

        const exportedCollection = getCollection(instance).export();
        validateClientIDs(exportedCollection);

        const annotationsFilter = new AnnotationsFilter();
        const filteredShapeIDs = annotationsFilter.filterSerializedCollection({
            shapes: exportedCollection.shapes,
            tags: [],
            tracks: [],
        }, instance.labels, filters).shapes;

        const filteredShapesByFrame = exportedCollection.shapes.reduce((acc, shape) => {
            if (shape.frame >= frameFrom && shape.frame <= frameTo && filteredShapeIDs.includes(shape.clientID)) {
                acc[shape.frame] = acc[shape.frame] ?? [];
                acc[shape.frame].push(shape);
            }
            return acc;
        }, {} as Record<number, SerializedShape[]>);

        const totalUpdates = { created: { shapes: [] }, deleted: { shapes: [] } };
        // Iterate over frames
        const totalFrames = frameTo - frameFrom + 1;
        for (let frame = frameFrom; frame <= frameTo; frame++) {
            const frameData = await Object.getPrototypeOf(instance).frames
                .get.implementation.call(instance, frame);

            // Ignore deleted frames
            if (!frameData.deleted) {
                const frameShapes = filteredShapesByFrame[frame] ?? [];
                if (!frameShapes.length) {
                    continue;
                }

                // finally apply the own filter of the action
                const filteredByAction = action.applyFilter({
                    collection: {
                        shapes: frameShapes,
                    },
                    frameData,
                });
                validateClientIDs(filteredByAction);

                const { created, deleted } = await action.run({
                    onProgress: throttledOnProgress,
                    cancelled,
                    collection: { shapes: filteredByAction.shapes },
                    frameData: {
                        width: frameData.width,
                        height: frameData.height,
                        number: frameData.number,
                    },
                });

                Array.prototype.push.apply(totalUpdates.created.shapes, created.shapes);
                Array.prototype.push.apply(totalUpdates.deleted.shapes, deleted.shapes);

                const progress = Math.ceil(+(((frame - frameFrom) / totalFrames) * 100));
                throttledOnProgress('Actions are running', progress);
                if (cancelled()) {
                    return;
                }
            }
        }

        await showMessageWithPause('Committing handled objects', 100, 1500);
        if (cancelled()) {
            return;
        }

        await instance.annotations.commit(
            { shapes: totalUpdates.created.shapes, tags: [], tracks: [] },
            { shapes: totalUpdates.deleted.shapes, tags: [], tracks: [] },
            frameFrom,
        );

        event.close();
    } finally {
        await action.destroy();
    }
}

export async function call(
    instance: Job | Task,
    action: BaseShapesAction,
    actionParameters: Record<string, string>,
    frame: number,
    states: ObjectState[],
    onProgress: (message: string, progress: number) => void,
    cancelled: () => boolean,
): Promise<void> {
    const event = await instance.logger.log(EventScope.annotationsAction, {
        from: frame,
        to: frame,
        name: action.name,
    }, true);

    const throttledOnProgress = throttle(onProgress, 100, { leading: true, trailing: true });
    try {
        await action.init(instance, prepareActionParameters(action.parameters, actionParameters));

        const exported = await Promise.all(states.filter((state) => state.objectType === ObjectType.SHAPE)
            .map((state) => state.export())) as SerializedShape[];
        const frameData = await Object.getPrototypeOf(instance).frames.get.implementation.call(instance, frame);
        const filteredByAction = action.applyFilter({ collection: { shapes: exported }, frameData });
        validateClientIDs(filteredByAction);

        const processedCollection = await action.run({
            onProgress: throttledOnProgress,
            cancelled,
            collection: { shapes: filteredByAction.shapes },
            frameData: {
                width: frameData.width,
                height: frameData.height,
                number: frameData.number,
            },
        });

        await instance.annotations.commit(
            { shapes: processedCollection.created.shapes, tags: [], tracks: [] },
            { shapes: processedCollection.deleted.shapes, tags: [], tracks: [] },
            frame,
        );

        event.close();
    } finally {
        await action.destroy();
    }
}
