// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { range, cloneDeep } from 'lodash';

import {
    Job, Task, ActionParameterType, BaseCollectionAction,
    ObjectType, ObjectState, Source, ShapeType,
} from 'cvat-core-wrapper';

type Collection = Parameters<BaseCollectionAction['run']>[0]['collection'];
type Track = Collection['tracks'][0];
type Shape = Collection['shapes'][0];

function imageBitmapToImageData(imageBitmap: ImageBitmap): ImageData {
    const canvas = new OffscreenCanvas(imageBitmap.width, imageBitmap.height);
    const ctx = canvas.getContext('2d') as OffscreenCanvasRenderingContext2D;
    ctx.drawImage(imageBitmap, 0, 0);
    return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

export default class OpenCVTrackerMIL extends BaseCollectionAction {
    #instance: Job | Task | null;
    #targetFrame: number;
    #convertRectangleShapesToTracks: boolean;
    readonly #openCVWrapper: any;
    readonly #name: string;

    public constructor(openCVWrapper: any) {
        super();
        this.#convertRectangleShapesToTracks = false;
        this.#targetFrame = 0;
        this.#instance = null;
        this.#name = openCVWrapper.tracking.trackerMIL.name;
        this.#openCVWrapper = openCVWrapper;
    }

    public async init(instance: Job | Task, parameters: Record<string, string>): Promise<void> {
        this.#instance = instance;
        this.#targetFrame = +parameters['Target frame'];
        this.#convertRectangleShapesToTracks = parameters['Convert rectangle shapes to tracks'] === 'true';
    }

    public async destroy(): Promise<void> {
        // nothing to destroy
    }

    public async run(
        {
            collection,
            frameData: { number },
            onProgress,
            cancelled,
        }: Parameters<BaseCollectionAction['run']>[0],
    ): ReturnType<BaseCollectionAction['run']> {
        const noChanges = {
            created: { shapes: [], tags: [], tracks: [] },
            deleted: { shapes: [], tags: [], tracks: [] },
        };

        if (this.#instance === null || number === this.#targetFrame) {
            return noChanges;
        }

        if (number >= this.#targetFrame) {
            throw new Error('OpenCV tracking backward is not supported');
        }

        const frameNumbers = this.#instance instanceof Job ?
            await this.#instance.frames.frameNumbers() : range(0, this.#instance.size);
        const targetFrameNumbers = frameNumbers.filter(
            (frameNumber: number) => frameNumber >= Math.min(number, this.#targetFrame) &&
                frameNumber <= Math.max(number, this.#targetFrame) &&
                frameNumber !== number,
        );

        if (targetFrameNumbers.length === 0) {
            return noChanges;
        }

        const objectStates = await this.#instance.annotations.get(number, false, []);
        const tracks = [...collection.tracks]; // shallow copy value as it may have added new values
        const { shapes } = collection;

        const [
            initialShapes,
            targetObjects,
            targetObjectStates,
        ] = ([] as (Shape | Track)[]).concat(shapes, tracks).reduce((acc, object) => {
            if (!Number.isInteger(object.clientID)) {
                return acc;
            }

            const objectState = objectStates.find((_objectState) => _objectState.clientID === object.clientID);
            if (!objectState) {
                return acc;
            }

            acc[0].push([...objectState.points as number[]]);

            if (this.#convertRectangleShapesToTracks && objectState.objectType === ObjectType.SHAPE) {
                const castedObject = object as Required<Shape>;
                const convertedTrack = {
                    source: Source.AUTO,
                    attributes: [],
                    elements: [],
                    frame: castedObject.frame,
                    group: castedObject.group,
                    label_id: castedObject.label_id,
                    shapes: [{
                        frame: castedObject.frame,
                        attributes: [],
                        occluded: castedObject.occluded,
                        outside: false,
                        points: [...castedObject.points],
                        rotation: castedObject.rotation,
                        z_order: castedObject.z_order,
                        type: castedObject.type,
                    }],
                };

                tracks.push(convertedTrack);
                acc[1].push(convertedTrack);
                acc[2].push(new Proxy(objectState, {
                    get(_objectState, p, receiver) {
                        if (p === 'objectType') {
                            return ObjectType.TRACK;
                        }

                        return Reflect.get(_objectState, p, receiver);
                    },
                }));
            } else {
                acc[1].push(object);
                acc[2].push(objectState);
            }

            return acc;
        }, [[], [], []] as [number[][], (Shape | Track)[], ObjectState[]]);

        if (!this.#openCVWrapper.isInitialized) {
            onProgress('OpenCV library initialization', 0);
            await this.#openCVWrapper.initialize(() => {});
            if (cancelled()) {
                return noChanges;
            }
        }

        onProgress('Action is running', 0);
        if (cancelled()) {
            return noChanges;
        }

        let currentProgress = 0;
        const progressPieces = targetFrameNumbers.length * initialShapes.length;
        const trackedShapes: Shape[] = [];

        for (let i = 0; i < initialShapes.length; i++) {
            const initialShape = initialShapes[i];
            const targetObject = targetObjects[i];
            const targetObjectState = targetObjectStates[i];
            const tracker = this.#openCVWrapper.tracking.trackerMIL.model();

            try {
                let frameData = await this.#instance.frames.get(number);
                let image = await frameData.data();
                const imageData = imageBitmapToImageData(image.imageData as ImageBitmap);

                tracker.init(imageData, initialShape);
                for (let j = 0; j < targetFrameNumbers.length; j++) {
                    currentProgress = i * targetFrameNumbers.length + j;

                    onProgress('Action is running', Math.ceil((currentProgress / progressPieces) * 100));
                    await new Promise((resolve) => {
                        setTimeout(resolve);
                    });

                    if (cancelled()) {
                        return noChanges;
                    }

                    const frame = targetFrameNumbers[j];
                    frameData = await this.#instance.frames.get(frame);
                    if (frameData.deleted) {
                        continue;
                    }

                    image = await frameData.data();
                    const { updated, points } = tracker.update(imageBitmapToImageData(image.imageData as ImageBitmap));
                    if (updated) {
                        if (targetObjectState.objectType === ObjectType.TRACK) {
                            const castedObject = targetObject as Track;
                            const existingShape = castedObject.shapes.find((_shape) => _shape.frame === frame) ?? null;

                            if (existingShape) {
                                existingShape.points = points;
                            } else {
                                castedObject.shapes.push({
                                    frame,
                                    attributes: [],
                                    occluded: targetObjectState.occluded,
                                    outside: false,
                                    points,
                                    rotation: 0,
                                    z_order: targetObjectState.zOrder,
                                    type: targetObjectState.shapeType,
                                });
                            }
                        } else {
                            const castedObject = targetObject as Shape;
                            trackedShapes.push({
                                elements: [],
                                group: castedObject.group,
                                frame,
                                source: Source.AUTO,
                                attributes: cloneDeep(castedObject.attributes),
                                occluded: castedObject.occluded,
                                outside: false,
                                points,
                                rotation: 0,
                                z_order: castedObject.z_order,
                                label_id: castedObject.label_id,
                                type: castedObject.type,
                            });
                        }
                    }
                }
            } finally {
                tracker.delete();
            }
        }

        return {
            created: { shapes: trackedShapes, tags: [], tracks },
            deleted: {
                // remove shapes converted to tracks
                shapes: this.#convertRectangleShapesToTracks ?
                    shapes.filter((shape) => shape.type === ShapeType.RECTANGLE) : [],
                // remove existing tracks as they were modified and will be rewritten
                tracks: collection.tracks,
                tags: [],
            },
        };
    }

    public applyFilter(
        input: Parameters<BaseCollectionAction['applyFilter']>[0],
    ): ReturnType<BaseCollectionAction['applyFilter']> {
        const { collection, frameData } = input;

        return {
            shapes: collection.shapes
                .filter((shape) => shape.frame === frameData.number && ShapeType.RECTANGLE === shape.type),
            tags: [],
            tracks: collection.tracks.filter((track) => {
                if (track.shapes[0].type !== ShapeType.RECTANGLE) {
                    return false;
                }

                // must be any shapes before current frame
                const shapesBefore = track.shapes.filter(
                    (shape) => shape.frame <= frameData.number).sort((a, b) => a.frame - b.frame,
                );

                if (shapesBefore.length === 0) {
                    return false;
                }

                // last shape must not be outside
                return !shapesBefore[shapesBefore.length - 1].outside;
            }),
        };
    }

    public isApplicableForObject(objectState: ObjectState): boolean {
        return objectState.shapeType === ShapeType.RECTANGLE;
    }

    public get name(): BaseCollectionAction['name'] {
        return this.#name;
    }

    public get parameters(): BaseCollectionAction['parameters'] {
        return {
            'Convert rectangle shapes to tracks': {
                type: ActionParameterType.CHECKBOX,
                values: ['true', 'false'],
                defaultValue: String(this.#convertRectangleShapesToTracks),
            },
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
