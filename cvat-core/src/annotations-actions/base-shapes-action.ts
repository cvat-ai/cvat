// Copyright (C) 2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { omit, throttle } from 'lodash';

import { Job, Task } from '../session';
import { SerializedCollection, SerializedShape } from '../server-response-types';
import { EventScope } from '../enums';
import { getCollection } from '../annotations';
import { ActionParameterType, BaseAction } from './base-action';
import AnnotationsFilter from 'annotations-filter';

export interface ShapesActionInput {
    collection: Pick<SerializedCollection, 'shapes'>;
    frameData: {
        width: number;
        height: number;
        number: number;
    };
}

export interface ShapesActionOutput {
    collection: ShapesActionInput['collection'];
}

export abstract class BaseShapesAction extends BaseAction {
    public abstract run(input: ShapesActionInput): Promise<ShapesActionOutput>;
    public abstract applyFilter(input: ShapesActionInput): ShapesActionInput['collection'];
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

    // if called too fast, it will freeze UI, so, add throttling here
    const wrappedOnProgress = throttle(onProgress, 100, { leading: true, trailing: true });
    const showMessageWithPause = async (message: string, progress: number, duration: number): Promise<void> => {
        // wrapper that gives a chance to abort action
        wrappedOnProgress(message, progress);
        await new Promise((resolve) => setTimeout(resolve, duration));
    };

    try {
        await showMessageWithPause('Actions initialization', 0, 500);
        if (cancelled()) {
            return;
        }

        const declaredParameters = action.parameters;
        if (!declaredParameters) {
            await action.init(instance, {});
        } else {
            const parameters = Object.entries(declaredParameters).reduce((acc, [name, { type, defaultValue }]) => {
                if (type === ActionParameterType.NUMBER) {
                    acc[name] = +(Object.hasOwn(actionParameters, name) ? actionParameters[name] : defaultValue);
                } else {
                    acc[name] = (Object.hasOwn(actionParameters, name) ? actionParameters[name] : defaultValue);
                }
                return acc;
            }, {} as Record<string, string | number>);

            await action.init(instance, parameters);
        }

        const exportedCollection = getCollection(instance).export();

        const annotationsFilter = new AnnotationsFilter();
        const filteredShapeIDs = annotationsFilter.filterSerializedCollection({
            shapes: exportedCollection.shapes,
            tags: [],
            tracks: [],
        }, instance.labels, filters).shapes;

        // key -1 contains final shapes collection
        const finalShapes = [];
        const filteredShapesByFrame = exportedCollection.shapes.reduce<Record<number, SerializedShape[]>>((acc, shape, idx) => {
            if (shape.frame >= frameFrom && shape.frame <= frameTo && filteredShapeIDs.includes(idx)) {
                acc[shape.frame] = acc[shape.frame] ?? [];
                acc[shape.frame].push(shape);
            } else {
                finalShapes.push(shape);
            }
            return acc;
        }, { });

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

                for (const shape of frameShapes) {
                    if (!filteredByAction.shapes.includes(shape)) {
                        finalShapes.push(shape);
                    }
                }

                Array.prototype.push.apply(
                    finalShapes,
                    (await action.run({
                        collection: { shapes: filteredByAction.shapes },
                        frameData: {
                            width: frameData.width,
                            height: frameData.height,
                            number: frameData.number,
                        },
                    })).collection.shapes.map((shape) => {
                        const body = omit(shape, 'id');
                        if (shape.elements.length) {
                            body.elements = body.elements.map((element) => omit(element, 'id'));
                        }

                        return body;
                    })
                );

                const progress = Math.ceil(+(((frame - frameFrom) / totalFrames) * 100));
                wrappedOnProgress('Actions are running', progress);
                if (cancelled()) {
                    return;
                }
            }
        }

        await showMessageWithPause('Commiting handled objects', 100, 1500);
        if (cancelled()) {
            return;
        }

        await instance.annotations.clear();
        await instance.actions.clear();
        await instance.annotations.import({
            shapes: filteredShapesByFrame[-1],
            tracks: exportedCollection.tracks,
            tags: exportedCollection.tags,
        });

        event.close();
    } finally {
        wrappedOnProgress('Finalizing', 100);
        await action.destroy();
    }
}
