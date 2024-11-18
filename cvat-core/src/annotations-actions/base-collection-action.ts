// Copyright (C) 2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { throttle } from 'lodash';

import AnnotationsFilter from '../annotations-filter';
import { Job, Task } from '../session';
import { SerializedCollection } from '../server-response-types';
import { EventScope } from '../enums';
import { getCollection } from '../annotations';
import { ActionParameterType, BaseAction } from './base-action';

export interface CollectionActionInput {
    onProgress(message: string, percent: number): void;
    cancelled(): boolean;

    collection: Omit<SerializedCollection, 'version'>;
    frameData: {
        width: number;
        height: number;
        number: number;
    };
}

export interface CollectionActionOutput {
    collection: Omit<SerializedCollection, 'version'>;
}

export abstract class BaseCollectionAction extends BaseAction {
    public abstract run(input: CollectionActionInput): Promise<CollectionActionOutput>;
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
        const filter = new AnnotationsFilter();
        const filteredCollectionIndexes = filter.filterSerializedCollection(
            exportedCollection,
            instance.labels,
            filters,
        );
        
        const filtered = {
            shapes: filteredCollectionIndexes.shapes.map((idx) => exportedCollection.shapes[idx]),
            tags: filteredCollectionIndexes.tags.map((idx) => exportedCollection.tags[idx]),
            tracks: filteredCollectionIndexes.tracks.map((idx) => exportedCollection.tracks[idx]),
        };

        const ignored =  {
            shapes: exportedCollection.shapes.filter((_, idx) => !filteredCollectionIndexes.shapes.includes(idx)),
            tags: exportedCollection.tags.filter((_, idx) => !filteredCollectionIndexes.tags.includes(idx)),
            tracks: exportedCollection.tracks.filter((_, idx) => !filteredCollectionIndexes.tracks.includes(idx)),
        };

        const handledCollection = (await action.run({
            collection: filtered,
            frameData: {
                width: frameData.width,
                height: frameData.height,
                number: frameData.number,
            },
            onProgress: wrappedOnProgress,
            cancelled: cancelled,
        })).collection;
        

        await instance.annotations.clear();
        await instance.actions.clear();
        await instance.annotations.import({
            shapes: [...handledCollection.shapes, ...ignored.shapes],
            tags: [...handledCollection.tags, ...ignored.tags],
            tracks: [...handledCollection.tracks, ...ignored.tracks],
        });

        event.close();
    } finally {
        wrappedOnProgress('Finalizing', 100);
        await action.destroy();
    }
}
