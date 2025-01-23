// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { throttle } from 'lodash';

import ObjectState from '../object-state';
import AnnotationsFilter from '../annotations-filter';
import { Job, Task } from '../session';
import {
    SerializedCollection, SerializedShape,
    SerializedTag, SerializedTrack,
} from '../server-response-types';
import { EventScope, ObjectType } from '../enums';
import { getCollection } from '../annotations';
import { BaseAction, prepareActionParameters, validateClientIDs } from './base-action';

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
    created: CollectionActionInput['collection'];
    deleted: CollectionActionInput['collection'];
}

export abstract class BaseCollectionAction extends BaseAction {
    public abstract run(input: CollectionActionInput): Promise<CollectionActionOutput>;
    public abstract applyFilter(
        input: Pick<CollectionActionInput, 'collection' | 'frameData'>,
    ): CollectionActionInput['collection'];
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

        await action.init(instance, prepareActionParameters(action.parameters, actionParameters));

        const frameData = await Object.getPrototypeOf(instance).frames
            .get.implementation.call(instance, frame);
        const exportedCollection = getCollection(instance).export();

        // Apply action filter first
        const filteredByAction = action.applyFilter({ collection: exportedCollection, frameData });
        validateClientIDs(filteredByAction);

        let mapID2Obj = [].concat(filteredByAction.shapes, filteredByAction.tags, filteredByAction.tracks)
            .reduce((acc, object) => {
                acc[object.clientID as number] = object;
                return acc;
            }, {});

        // Then apply user filter
        const annotationsFilter = new AnnotationsFilter();
        const filteredCollectionIDs = annotationsFilter
            .filterSerializedCollection(filteredByAction, instance.labels, filters);
        const filteredByUser = {
            shapes: filteredCollectionIDs.shapes.map((clientID) => mapID2Obj[clientID]),
            tags: filteredCollectionIDs.tags.map((clientID) => mapID2Obj[clientID]),
            tracks: filteredCollectionIDs.tracks.map((clientID) => mapID2Obj[clientID]),
        };
        mapID2Obj = [].concat(filteredByUser.shapes, filteredByUser.tags, filteredByUser.tracks)
            .reduce((acc, object) => {
                acc[object.clientID as number] = object;
                return acc;
            }, {});

        const { created, deleted } = await action.run({
            collection: filteredByUser,
            frameData: {
                width: frameData.width,
                height: frameData.height,
                number: frameData.number,
            },
            onProgress: wrappedOnProgress,
            cancelled,
        });

        await instance.annotations.commit(created, deleted, frame);
        event.close();
    } finally {
        await action.destroy();
    }
}

export async function call(
    instance: Job | Task,
    action: BaseCollectionAction,
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
        const exportedStates = await Promise.all(states.map((state) => state.export()));
        const exportedCollection = exportedStates.reduce<CollectionActionInput['collection']>((acc, value, idx) => {
            if (states[idx].objectType === ObjectType.SHAPE) {
                acc.shapes.push(value as SerializedShape);
            }

            if (states[idx].objectType === ObjectType.TAG) {
                acc.tags.push(value as SerializedTag);
            }

            if (states[idx].objectType === ObjectType.TRACK) {
                acc.tracks.push(value as SerializedTrack);
            }

            return acc;
        }, { shapes: [], tags: [], tracks: [] });

        const frameData = await Object.getPrototypeOf(instance).frames.get.implementation.call(instance, frame);
        const filteredByAction = action.applyFilter({ collection: exportedCollection, frameData });
        validateClientIDs(filteredByAction);

        const processedCollection = await action.run({
            onProgress: throttledOnProgress,
            cancelled,
            collection: filteredByAction,
            frameData: {
                width: frameData.width,
                height: frameData.height,
                number: frameData.number,
            },
        });

        await instance.annotations.commit(
            processedCollection.created,
            processedCollection.deleted,
            frame,
        );
        event.close();
    } finally {
        await action.destroy();
    }
}
