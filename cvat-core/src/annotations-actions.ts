// Copyright (C) 2023-2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { omit, throttle } from 'lodash';
import { ArgumentError } from './exceptions';
import { SerializedCollection, SerializedShape } from './server-response-types';
import { Job, Task } from './session';
import { EventScope, ObjectType } from './enums';
import ObjectState from './object-state';
import { getAnnotations, getCollection } from './annotations';
import { propagateShapes } from './object-utils';

export interface SingleFrameActionInput {
    collection: Omit<SerializedCollection, 'tracks' | 'tags' | 'version'>;
    frameData: {
        width: number;
        height: number;
        number: number;
    };
}

export interface SingleFrameActionOutput {
    collection: Omit<SerializedCollection, 'tracks' | 'tags' | 'version'>;
}

export enum ActionParameterType {
    SELECT = 'select',
    NUMBER = 'number',
}

// For SELECT values should be a list of possible options
// For NUMBER values should be a list with [min, max, step],
// or a callback ({ instance }: { instance: Job | Task }) => [min, max, step]
type ActionParameters = Record<string, {
    type: ActionParameterType;
    values: string[] | (({ instance }: { instance: Job | Task }) => string[]);
    defaultValue: string | (({ instance }: { instance: Job | Task }) => string);
}>;

export enum FrameSelectionType {
    SEGMENT = 'segment',
    CURRENT_FRAME = 'current_frame',
}

export default class BaseSingleFrameAction {
    /* eslint-disable @typescript-eslint/no-unused-vars */
    public async init(
        sessionInstance: Job | Task,
        parameters: Record<string, string | number>,
    ): Promise<void> {
        throw new Error('Method not implemented');
    }

    public async destroy(): Promise<void> {
        throw new Error('Method not implemented');
    }

    public async run(sessionInstance: Job | Task, input: SingleFrameActionInput): Promise<SingleFrameActionOutput> {
        throw new Error('Method not implemented');
    }

    public get name(): string {
        throw new Error('Method not implemented');
    }

    public get parameters(): ActionParameters | null {
        throw new Error('Method not implemented');
    }

    public get frameSelection(): FrameSelectionType {
        return FrameSelectionType.SEGMENT;
    }
}

class RemoveFilteredShapes extends BaseSingleFrameAction {
    public async init(): Promise<void> {
        // nothing to init
    }

    public async destroy(): Promise<void> {
        // nothing to destroy
    }

    public async run(): Promise<SingleFrameActionOutput> {
        return { collection: { shapes: [] } };
    }

    public get name(): string {
        return 'Remove filtered shapes';
    }

    public get parameters(): ActionParameters | null {
        return null;
    }
}

class PropagateShapes extends BaseSingleFrameAction {
    #targetFrame: number;

    public async init(instance, parameters): Promise<void> {
        this.#targetFrame = parameters['Target frame'];
    }

    public async destroy(): Promise<void> {
        // nothing to destroy
    }

    public async run(
        instance,
        { collection: { shapes }, frameData: { number } },
    ): Promise<SingleFrameActionOutput> {
        if (number === this.#targetFrame) {
            return { collection: { shapes } };
        }
        const propagatedShapes = propagateShapes<SerializedShape>(shapes, number, this.#targetFrame);
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

    public get frameSelection(): FrameSelectionType {
        return FrameSelectionType.CURRENT_FRAME;
    }
}

const registeredActions: BaseSingleFrameAction[] = [];

export async function listActions(): Promise<BaseSingleFrameAction[]> {
    return [...registeredActions];
}

export async function registerAction(action: BaseSingleFrameAction): Promise<void> {
    if (!(action instanceof BaseSingleFrameAction)) {
        throw new ArgumentError('Provided action is not instance of BaseSingleFrameAction');
    }

    const { name } = action;
    if (registeredActions.map((_action) => _action.name).includes(name)) {
        throw new ArgumentError(`Action name must be unique. Name "${name}" is already exists`);
    }

    registeredActions.push(action);
}

registerAction(new RemoveFilteredShapes());
registerAction(new PropagateShapes());

async function runSingleFrameChain(
    instance: Job | Task,
    actionsChain: BaseSingleFrameAction[],
    actionParameters: Record<string, string>[],
    frameFrom: number,
    frameTo: number,
    filters: string[],
    onProgress: (message: string, progress: number) => void,
    cancelled: () => boolean,
): Promise<void> {
    type IDsToHandle = { shapes: number[] };
    const event = await instance.logger.log(EventScope.annotationsAction, {
        from: frameFrom,
        to: frameTo,
        chain: actionsChain.map((action) => action.name).join(' => '),
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

        await Promise.all(actionsChain.map((action, idx) => {
            const declaredParameters = action.parameters;
            if (!declaredParameters) {
                return action.init(instance, {});
            }

            const setupValues = actionParameters[idx];
            const parameters = Object.entries(declaredParameters).reduce((acc, [name, { type, defaultValue }]) => {
                if (type === ActionParameterType.NUMBER) {
                    acc[name] = +(Object.hasOwn(setupValues, name) ? setupValues[name] : defaultValue);
                } else {
                    acc[name] = (Object.hasOwn(setupValues, name) ? setupValues[name] : defaultValue);
                }
                return acc;
            }, {} as Record<string, string | number>);

            return action.init(instance, parameters);
        }));

        const exportedCollection = getCollection(instance).export();
        const handledCollection: SingleFrameActionInput['collection'] = { shapes: [] };
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

                // Iterate over actions on each not deleted frame
                for await (const action of actionsChain) {
                    ({ collection: frameCollection } = await action.run(instance, {
                        collection: frameCollection,
                        frameData: {
                            width: frameData.width,
                            height: frameData.height,
                            number: frameData.number,
                        },
                    }));
                }

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
        await Promise.all(actionsChain.map((action) => action.destroy()));
    }
}

export async function runActions(
    instance: Job | Task,
    actionsChain: BaseSingleFrameAction[],
    actionParameters: Record<string, string>[],
    frameFrom: number,
    frameTo: number,
    filters: string[],
    onProgress: (message: string, progress: number) => void,
    cancelled: () => boolean,
): Promise<void> {
    // there will be another function for MultiFrameChains (actions handling tracks)
    return runSingleFrameChain(
        instance,
        actionsChain,
        actionParameters,
        frameFrom,
        frameTo,
        filters,
        onProgress,
        cancelled,
    );
}
