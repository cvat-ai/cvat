// Copyright (C) 2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { throttle, omit } from 'lodash';

import AnnotationsFilter from '../annotations-filter';
import { Job, Task } from '../session';
import { SerializedCollection } from '../server-response-types';
import { EventScope } from '../enums';
import { getCollection } from '../annotations';
import { ActionParameterType, BaseAction } from './base-action';

export interface CollectionActionInput {
    onProgress(message: string, percent: number): void;
    cancelled(): boolean;

    collection: Pick<SerializedCollection, 'shapes' | 'tags' | 'tracks'>;
    frameData: {
        width: number;
        height: number;
        number: number;
    };
}

export interface CollectionActionOutput {
    collection: CollectionActionInput['collection'];
}

export abstract class BaseCollectionAction extends BaseAction {
    public abstract run(input: CollectionActionInput): Promise<CollectionActionOutput>;
    public abstract applyFilter(input: Pick<CollectionActionInput, 'collection' | 'frameData'>): {
        filtered: CollectionActionInput['collection'];
        ignored: CollectionActionInput['collection'];
    };
}

export async function run(
    instance: Job | Task,
    action: BaseCollectionAction,
    actionParameters: Record<string, string>,
    frame: number,
    filters: object[],
    onProgress: (message: string, progress: number) => void,
    cancelled: () => boolean,
): Promise<void> {
    const event = await instance.logger.log(EventScope.annotationsAction, {
        from: frame,
        to: frame,
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
        await showMessageWithPause('Action initialization', 0, 500);
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

        const frameData = await Object.getPrototypeOf(instance).frames
            .get.implementation.call(instance, frame);
        const exportedCollection = getCollection(instance).export();

        const annotationsFilter = new AnnotationsFilter();
        const filteredCollectionIndexes = annotationsFilter
            .filterSerializedCollection(exportedCollection, instance.labels, filters);

        const filteredByUser = {
            shapes: filteredCollectionIndexes.shapes.map((idx) => exportedCollection.shapes[idx]),
            tags: filteredCollectionIndexes.tags.map((idx) => exportedCollection.tags[idx]),
            tracks: filteredCollectionIndexes.tracks.map((idx) => exportedCollection.tracks[idx]),
        };

        // TODO: shall we optimize "includes" as collections may be large in this code
        const finalCollection =  {
            shapes: exportedCollection.shapes.filter((_, idx) => !filteredCollectionIndexes.shapes.includes(idx)),
            tags: exportedCollection.tags.filter((_, idx) => !filteredCollectionIndexes.tags.includes(idx)),
            tracks: exportedCollection.tracks.filter((_, idx) => !filteredCollectionIndexes.tracks.includes(idx)),
        };

        const { filtered: filteredByAction } = action.applyFilter({ collection: filteredByUser, frameData });
        filteredByUser.shapes
            .forEach((shape) => !filteredByAction.shapes.includes(shape) && finalCollection.shapes.push(shape));
        filteredByUser.tags
            .forEach((tag) => !filteredByAction.tags.includes(tag) && finalCollection.tags.push(tag));
        filteredByUser.tracks
            .forEach((track) => !filteredByAction.tracks.includes(track) && finalCollection.tracks.push(track));

        const handledCollection = (await action.run({
            collection: filteredByAction,
            frameData: {
                width: frameData.width,
                height: frameData.height,
                number: frameData.number,
            },
            onProgress: wrappedOnProgress,
            cancelled: cancelled,
        })).collection;

        // remove ids for updated objects, they are considered like new objects
        handledCollection.tags = handledCollection.tags.map((tag) => omit(tag, 'id'));
        handledCollection.shapes = handledCollection.shapes.map((shape) => {
            const body = omit(shape, 'id');
            if (shape.elements.length) {
                body.elements = body.elements.map((element) => omit(element, 'id'));
            }
            return body;
        });
        handledCollection.tracks = handledCollection.tracks.map((track) => {
            const body = omit(track, 'id');
            body.shapes = body.shapes.map((shape) => omit(shape, 'id'));
            if (body.elements.length) {
                body.elements = body.elements.map((element) => ({
                    ...omit(element, 'id'),
                    shapes: element.shapes.map((shape) => omit(shape, 'id')),
                }));
            }
            return body;
        })

        Array.prototype.push.apply(finalCollection.shapes, handledCollection.shapes);
        Array.prototype.push.apply(finalCollection.tags, handledCollection.tags);
        Array.prototype.push.apply(finalCollection.tracks, handledCollection.tracks);

        await instance.annotations.clear();
        await instance.actions.clear();
        await instance.annotations.import(finalCollection);

        event.close();
    } finally {
        wrappedOnProgress('Finalizing', 100);
        await action.destroy();
    }
}
