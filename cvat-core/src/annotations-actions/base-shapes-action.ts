// Copyright (C) 2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { omit, throttle } from 'lodash';

import ObjectState from '../object-state';
import { Job, Task } from '../session';
import { SerializedCollection } from '../server-response-types';
import { EventScope, ObjectType } from '../enums';
import { getAnnotations, getCollection } from '../annotations';
import { ActionParameterType, BaseAction } from './base-action';

export interface ShapesActionInput {
    collection: Omit<SerializedCollection, 'tracks' | 'tags' | 'version'>;
    frameData: {
        width: number;
        height: number;
        number: number;
    };
}

export interface ShapesActionOutput {
    collection: Omit<SerializedCollection, 'tracks' | 'tags' | 'version'>;
}

export abstract class BaseShapesAction extends BaseAction {
    public abstract run(input: ShapesActionInput): Promise<ShapesActionOutput>;
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
    type IDsToHandle = { shapes: number[] };
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
        const handledCollection: ShapesActionInput['collection'] = { shapes: [] };
        const modifiedCollectionIDs: IDsToHandle = { shapes: [] };

        // Iterate over frames
        const totalFrames = frameTo - frameFrom + 1;
        for (let frame = frameFrom; frame <= frameTo; frame++) {
            const frameData = await Object.getPrototypeOf(instance).frames
                .get.implementation.call(instance, frame);

            // Ignore deleted frames
            if (!frameData.deleted) {
                // Get annotations according to filter
                const states: ObjectState[] = await getAnnotations(instance, frame, false, filters);
                const frameCollectionIDs = states.reduce<IDsToHandle>((acc, val) => {
                    if (val.objectType === ObjectType.SHAPE) {
                        acc.shapes.push(val.clientID as number);
                    }
                    return acc;
                }, { shapes: [] });

                // Pick frame collection according to filtered IDs
                let frameCollection = {
                    shapes: exportedCollection.shapes.filter((shape) => frameCollectionIDs
                        .shapes.includes(shape.clientID as number)),
                };

                ({ collection: frameCollection } = await action.run({
                    collection: frameCollection,
                    frameData: {
                        width: frameData.width,
                        height: frameData.height,
                        number: frameData.number,
                    },
                }));

                const progress = Math.ceil(+(((frame - frameFrom) / totalFrames) * 100));
                wrappedOnProgress('Actions are running', progress);
                if (cancelled()) {
                    return;
                }

                handledCollection.shapes.push(...frameCollection.shapes.map((shape) => omit(shape, 'id')));
                modifiedCollectionIDs.shapes.push(...frameCollectionIDs.shapes);
            }
        }

        await showMessageWithPause('Commiting handled objects', 100, 1500);
        if (cancelled()) {
            return;
        }

        exportedCollection.shapes.forEach((shape) => {
            if (Number.isInteger(shape.clientID) && !modifiedCollectionIDs.shapes.includes(shape.clientID as number)) {
                handledCollection.shapes.push(shape);
            }
        });

        await instance.annotations.clear();
        await instance.actions.clear();
        await instance.annotations.import({
            ...handledCollection,
            tracks: exportedCollection.tracks,
            tags: exportedCollection.tags,
        });

        event.close();
    } finally {
        wrappedOnProgress('Finalizing', 100);
        await action.destroy();
    }
}
