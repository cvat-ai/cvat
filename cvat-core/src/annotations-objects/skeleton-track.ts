// Copyright (C) 2019-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import ObjectState, { type SerializedData } from '../object-state';
import {
    ShapeType, ObjectType, HistoryActions,
} from '../enums';
import type { SerializedTrack } from '../server-response-types';
import { computeWrappingBox, rotatePoint } from '../object-utils';
import { type ImageObject, InterpolationNotPossibleError } from './image-object';
import { Track } from './track';
import type { AnnotationInjection, InterpolatedPosition } from './types';
import { computeNewSource, copyShape } from './utils';
// eslint-disable-next-line import/no-cycle
import { SkeletonShape } from './skeleton-shape';
import { trackFactory } from './index';

export class SkeletonTrack extends Track {
    public elements: Track[];

    constructor(data: SerializedTrack, clientID: number, color: string, injection: AnnotationInjection) {
        super(data, clientID, color, injection);
        this.shapeType = ShapeType.SKELETON;
        this.readOnlyFields = ['points', 'label', 'occluded', 'outside'];
        this.pinned = false;

        const [cx, cy] = data.elements.reduce((acc, element, idx) => {
            const shape = element.shapes[0];
            if (!shape || shape.frame !== this.frame) {
                return acc;
            }

            const result = [acc[0] + shape.points[0], acc[1] + shape.points[1], acc[2] + 1];
            if (idx === data.elements.length - 1) {
                // avoid division by 0, additionally
                return [result[0] / (result[2] || 1), result[1] / (result[2] || 1)];
            }

            return result;
        }, [0, 0, 0]);

        this.elements = this.label.structure.sublabels.map((sublabel) => {
            const element = data.elements.find((_element) => _element.label_id === sublabel.id);
            const elementData = element || {
                label_id: sublabel.id,
                frame: this.frame,
                attributes: [],
                shapes: [{
                    attributes: [],
                    points: [cx, cy],
                    frame: this.frame,
                    occluded: false,
                    outside: true,
                    rotation: 0,
                    type: sublabel.type as unknown as ShapeType,
                }],
            };

            return trackFactory({
                ...elementData,
                group: this.group,
                source: this.source,
                shapes: elementData.shapes.map((shape) => ({
                    ...shape,
                    z_order: this.shapes[shape.frame]?.zOrder || 0,
                })),
            }, injection.nextClientID(), {
                ...injection,
                parentId: this.clientID,
            });
        }).filter(Boolean).sort((a: ImageObject, b: ImageObject) => a.label.id - b.label.id);
    }

    public updateFromServerResponse(body: Parameters<typeof Track.prototype.updateFromServerResponse>[0] & {
        elements?: {
            id: number;
            frame: number;
            label_id: number;
            shapes: SerializedTrack['shapes'];
        }[];
    }): void {
        super.updateFromServerResponse(body);
        if ('elements' in body) {
            for (const element of body.elements) {
                const context = this.elements.find((_element: Track) => _element.label.id === element.label_id);
                context.updateFromServerResponse(element);
            }
        }
    }

    public clearServerId(): void {
        super.clearServerId();
        for (const element of this.elements) {
            element.clearServerId();
        }
    }

    protected saveRotation(rotation: number, frame: number): void {
        const undoSkeletonShapes = this.elements.map((element) => element.shapes[frame]);
        const undoSource = this.source;
        const redoSource = this.readOnlyFields.includes('source') ? this.source : computeNewSource(this.source);

        const elementsData = this.elements.map((element) => element.get(frame));
        const skeletonPoints = elementsData.map((data) => data.points);
        const bbox = computeWrappingBox(skeletonPoints.flat());
        const [cx, cy] = [bbox.x + bbox.width / 2, bbox.y + bbox.height / 2];

        for (let i = 0; i < this.elements.length; i++) {
            const element = this.elements[i];
            const { points } = elementsData[i];

            const rotatedPoints = [];
            for (let j = 0; j < points.length; j += 2) {
                const [x, y] = [points[j], points[j + 1]];
                rotatedPoints.push(...rotatePoint(x, y, rotation, cx, cy));
            }

            if (undoSkeletonShapes[i]) {
                element.shapes[frame] = {
                    ...undoSkeletonShapes[i],
                    points: rotatedPoints,
                };
            } else {
                element.shapes[frame] = {
                    ...copyShape(elementsData[i]),
                    points: rotatedPoints,
                };
            }
        }
        this.source = redoSource;

        const redoSkeletonShapes = this.elements.map((element) => element.shapes[frame]);
        this.history.do(
            HistoryActions.CHANGED_ROTATION,
            () => {
                for (let i = 0; i < this.elements.length; i++) {
                    const element = this.elements[i];
                    if (undoSkeletonShapes[i]) {
                        element.shapes[frame] = undoSkeletonShapes[i];
                    } else {
                        delete element.shapes[frame];
                    }
                    this.updated = Date.now();
                }
                this.source = undoSource;
                this.updated = Date.now();
            },
            () => {
                for (let i = 0; i < this.elements.length; i++) {
                    const element = this.elements[i];
                    element.shapes[frame] = redoSkeletonShapes[i];
                    this.updated = Date.now();
                }
                this.source = redoSource;
                this.updated = Date.now();
            },
            [this.clientID, ...this.elements.map((element) => element.clientID)],
            frame,
        );
    }

    // Method is used to export data to the server
    public toJSON(): SerializedTrack {
        const result: SerializedTrack = Track.prototype.toJSON.call(this);

        result.shapes = result.shapes.map((shape) => ({
            ...shape,
            points: [],
        }));

        result.elements = this.elements.map((el) => ({
            ...el.toJSON(),
            source: this.source,
            group: this.group,
        }));

        result.elements.forEach((element) => {
            element.shapes.forEach((shape) => {
                shape.rotation = 0;
                const { frame } = shape;
                const skeletonShape = result.shapes
                    .find((_skeletonShape) => _skeletonShape.frame === frame);
                if (skeletonShape) {
                    shape.z_order = skeletonShape.z_order;
                }
            });
        });

        return result;
    }

    public get(frame: number): Omit<Required<SerializedData>, 'score' | 'votes'> {
        const { prev, next } = this.boundedKeyframes(frame);
        const position = this.getPosition(frame, prev, next);
        const elements = this.elements.map((element) => ({
            ...element.get(frame),
            source: this.source,
            group: this.groupObject,
            zOrder: position.zOrder,
            rotation: 0,
        }));

        return {
            ...position,
            parentID: null,
            keyframe: position.keyframe || elements.some((el) => el.keyframe),
            attributes: this.getAttributes(frame),
            descriptions: [...this.descriptions],
            group: this.groupObject,
            objectType: ObjectType.TRACK,
            shapeType: this.shapeType,
            clientID: this.clientID,
            serverID: this._serverId ?? null,
            color: this.color,
            updated: Math.max(this.updated, ...this.elements.map((element) => element.updated)),
            label: this.label,
            pinned: this.pinned,
            keyframes: this.deepBoundedKeyframes(frame),
            elements,
            frame,
            source: this.source,
            outside: elements.every((el) => el.outside),
            occluded: elements.every((el) => el.occluded),
            lock: elements.every((el) => el.lock),
            hidden: elements.every((el) => el.hidden),
            __internal: this.withContext(),
        };
    }

    // finds keyframes considering keyframes of nested elements
    private deepBoundedKeyframes(targetFrame: number): ObjectState['keyframes'] {
        const boundedKeyframes = Track.prototype.boundedKeyframes.call(this, targetFrame);

        for (const element of this.elements) {
            const keyframes = element.boundedKeyframes(targetFrame);
            if (keyframes.prev !== null) {
                boundedKeyframes.prev = boundedKeyframes.prev === null || keyframes.prev > boundedKeyframes.prev ?
                    keyframes.prev : boundedKeyframes.prev;
            }

            if (keyframes.next !== null) {
                boundedKeyframes.next = boundedKeyframes.next === null || keyframes.next < boundedKeyframes.next ?
                    keyframes.next : boundedKeyframes.next;
            }

            if (keyframes.first !== null) {
                boundedKeyframes.first =
                    boundedKeyframes.first === null || keyframes.first < boundedKeyframes.first ?
                        keyframes.first : boundedKeyframes.first;
            }

            if (keyframes.last !== null) {
                boundedKeyframes.last = boundedKeyframes.last === null || keyframes.last > boundedKeyframes.last ?
                    keyframes.last : boundedKeyframes.last;
            }
        }

        return boundedKeyframes;
    }

    public save(frame: number, data: ObjectState): ObjectState {
        if (this.lock && data.lock) {
            return new ObjectState(this.get(frame));
        }

        const updateElements = (affectedElements, action, property: 'hidden' | 'lock' | null = null): void => {
            const undoSkeletonProperties = this.elements.map((element) => element[property] || null);
            const undoSkeletonShapes = this.elements.map((element) => element.shapes[frame]);
            const undoSource = this.source;
            const redoSource = this.readOnlyFields.includes('source') ? this.source : computeNewSource(this.source);

            const errors = [];
            try {
                this.history.freeze(true);
                affectedElements.forEach((element, idx) => {
                    try {
                        const annotationContext = this.elements[idx];
                        annotationContext.save(frame, element);
                    } catch (error: any) {
                        errors.push(error);
                    }
                });
            } finally {
                this.history.freeze(false);
            }

            const redoSkeletonProperties = this.elements.map((element) => element[property] || null);
            const redoSkeletonShapes = this.elements.map((element) => element.shapes[frame]);

            this.history.do(
                action,
                () => {
                    for (let i = 0; i < this.elements.length; i++) {
                        if (property) {
                            this.elements[i][property] = undoSkeletonProperties[i];
                        } if (undoSkeletonShapes[i]) {
                            this.elements[i].shapes[frame] = undoSkeletonShapes[i];
                        } else if (redoSkeletonShapes[i]) {
                            delete this.elements[i].shapes[frame];
                        }
                        this.elements[i].updated = Date.now();
                    }
                    this.source = undoSource;
                    this.updated = Date.now();
                },
                () => {
                    for (let i = 0; i < this.elements.length; i++) {
                        if (property) {
                            this.elements[i][property] = redoSkeletonProperties[i];
                        } else if (redoSkeletonShapes[i]) {
                            this.elements[i].shapes[frame] = redoSkeletonShapes[i];
                        } else if (undoSkeletonShapes[i]) {
                            delete this.elements[i].shapes[frame];
                        }
                        this.elements[i].updated = Date.now();
                    }
                    this.source = redoSource;
                    this.updated = Date.now();
                },
                [this.clientID, ...affectedElements.map((element) => element.clientID)],
                frame,
            );

            if (errors.length) {
                throw new Error(`Several errors occurred during saving skeleton:\n ${errors.join(';\n')}`);
            }
        };

        const updatedPoints = data.elements.filter((el) => el.updateFlags.points);
        const updatedOccluded = data.elements.filter((el) => el.updateFlags.occluded);
        const updatedOutside = data.elements.filter((el) => el.updateFlags.outside);
        const updatedKeyframe = data.elements.filter((el) => el.updateFlags.keyframe);
        const updatedHidden = data.elements.filter((el) => el.updateFlags.hidden);
        const updatedLock = data.elements.filter((el) => el.updateFlags.lock);

        updatedOccluded.forEach((el) => { el.updateFlags.occluded = false; });
        updatedOutside.forEach((el) => { el.updateFlags.outside = false; });
        updatedKeyframe.forEach((el) => { el.updateFlags.keyframe = false; });
        updatedHidden.forEach((el) => { el.updateFlags.hidden = false; });
        updatedLock.forEach((el) => { el.updateFlags.lock = false; });

        if (updatedPoints.length) {
            updateElements(updatedPoints, HistoryActions.CHANGED_POINTS);
        }

        if (updatedOccluded.length) {
            updatedOccluded.forEach((el) => { el.updateFlags.occluded = true; });
            updateElements(updatedOccluded, HistoryActions.CHANGED_OCCLUDED);
        }

        if (updatedOutside.length) {
            updatedOutside.forEach((el) => { el.updateFlags.outside = true; });
            updateElements(updatedOutside, HistoryActions.CHANGED_OUTSIDE);
        }

        if (updatedKeyframe.length) {
            updatedKeyframe.forEach((el) => { el.updateFlags.keyframe = true; });
            // todo: fix extra undo/redo change
            this.validateStateBeforeSave(data, data.updateFlags, frame);
            this.saveKeyframe(frame, data.keyframe);
            // eslint-disable-next-line no-param-reassign
            data.updateFlags.keyframe = false;
            updateElements(updatedKeyframe, HistoryActions.CHANGED_KEYFRAME);
        }

        if (updatedHidden.length) {
            updatedHidden.forEach((el) => { el.updateFlags.hidden = true; });
            updateElements(updatedHidden, HistoryActions.CHANGED_HIDDEN, 'hidden');
        }

        if (updatedLock.length) {
            updatedLock.forEach((el) => { el.updateFlags.lock = true; });
            updateElements(updatedLock, HistoryActions.CHANGED_LOCK, 'lock');
        }

        const result = Track.prototype.save.call(this, frame, data);
        return result;
    }

    protected getPosition(
        targetFrame: number, leftKeyframe: number | null, rightKeyframe: number | null,
    ): InterpolatedPosition & { keyframe: boolean } {
        const leftFrame = targetFrame in this.shapes ? targetFrame : leftKeyframe;
        const rightPosition = Number.isInteger(rightKeyframe) ? this.shapes[rightKeyframe] : null;
        const leftPosition = Number.isInteger(leftFrame) ? this.shapes[leftFrame] : null;

        if (leftPosition && rightPosition) {
            return {
                rotation: 0,
                occluded: leftPosition.occluded,
                outside: leftPosition.outside,
                zOrder: leftPosition.zOrder,
                keyframe: targetFrame in this.shapes,
                points: [],
            };
        }

        const singlePosition = leftPosition || rightPosition;
        if (singlePosition) {
            return {
                rotation: 0,
                occluded: singlePosition.occluded,
                zOrder: singlePosition.zOrder,
                keyframe: targetFrame in this.shapes,
                outside: singlePosition === rightPosition ? true : singlePosition.outside,
                points: [],
            };
        }

        throw new InterpolationNotPossibleError();
    }
}

Object.defineProperty(SkeletonTrack, 'distance', { value: SkeletonShape.distance });
