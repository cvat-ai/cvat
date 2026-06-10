// Copyright (C) 2019-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import ObjectState, { type SerializedData } from '../object-state';
import { ScriptingError } from '../exceptions';
import type { Label } from '../labels';
import {
    ShapeType, ObjectType, HistoryActions,
} from '../enums';
import type { SerializedShape } from '../server-response-types';
import { computeWrappingBox, rotatePoint } from '../object-utils';
import { Shape } from './shape';
import type { AnnotationInjection } from './types';
import { computeNewSource, serializeAttributes } from './utils';
// eslint-disable-next-line import/no-cycle
import { shapeFactory } from './index';

export class SkeletonShape extends Shape {
    public elements: Shape[];

    constructor(data: SerializedShape, clientID: number, color: string, injection: AnnotationInjection) {
        super(data, clientID, color, injection);
        this.shapeType = ShapeType.SKELETON;
        this.pinned = false;
        this.rotation = 0;
        this.occluded = false;
        this.points = [];
        this.readOnlyFields = ['points', 'label', 'occluded'];

        const [cx, cy] = data.elements.reduce((acc, element, idx) => {
            const result = [acc[0] + element.points[0], acc[1] + element.points[1]];
            if (idx === data.elements.length - 1) {
                // length can not be 0 because we are inside reduce
                result[0] /= data.elements.length;
                result[1] /= data.elements.length;
            }
            return result;
        }, [0, 0]);

        this.elements = this.label.structure.sublabels.map((sublabel: Label) => {
            const element = data.elements.find((_element) => _element.label_id === sublabel.id);
            const elementData = element || {
                label_id: sublabel.id,
                attributes: [],
                occluded: false,
                outside: true,
                points: [cx, cy],
                type: sublabel.type as unknown as ShapeType,
            };

            return shapeFactory({
                ...elementData,
                group: this.group,
                z_order: this.zOrder,
                source: this.source,
                rotation: 0,
                frame: data.frame,
            }, injection.nextClientID(), {
                ...injection,
                parentId: this.clientID,
            });
        });
    }

    static distance(points: number[], x: number, y: number): number | null {
        const distances = [];
        let xtl = Number.MAX_SAFE_INTEGER;
        let ytl = Number.MAX_SAFE_INTEGER;
        let xbr = 0;
        let ybr = 0;

        const MARGIN = 20;
        for (let i = 0; i < points.length; i += 2) {
            const x1 = points[i];
            const y1 = points[i + 1];
            xtl = Math.min(x1, xtl);
            ytl = Math.min(y1, ytl);
            xbr = Math.max(x1, xbr);
            ybr = Math.max(y1, ybr);

            distances.push(Math.sqrt((x1 - x) ** 2 + (y1 - y) ** 2));
        }

        xtl -= MARGIN;
        xbr += MARGIN;
        ytl -= MARGIN;
        ybr += MARGIN;

        if (!(x >= xtl && x <= xbr && y >= ytl && y <= ybr)) {
            // Cursor is outside of a box
            return null;
        }

        return Math.min.apply(null, distances);
    }

    // Method is used to export data to the server
    public toJSON(): SerializedShape {
        const elements = this.elements.map((element) => ({
            ...element.toJSON(),
            outside: element.outside,
            points: [...element.points],
            source: this.source,
            group: this.group,
            z_order: this.zOrder,
            rotation: 0,
        }));

        const result: SerializedShape = {
            type: this.shapeType,
            clientID: this.clientID,
            occluded: elements.every((el) => el.occluded),
            outside: elements.every((el) => el.outside),
            z_order: this.zOrder,
            points: [],
            rotation: 0,
            attributes: serializeAttributes(this.attributes),
            elements,
            frame: this.frame,
            label_id: this.label.id,
            group: this.group,
            source: this.source,
            score: this.score,
        };

        if (typeof this._serverId === 'number') {
            result.id = this._serverId;
        }

        return result;
    }

    public get(frame): Omit<Required<SerializedData>, 'keyframe' | 'keyframes'> {
        if (frame !== this.frame) {
            throw new ScriptingError('Received frame is not equal to the frame of the shape');
        }

        const elements = this.elements.map((element) => ({
            ...element.get(frame),
            source: this.source,
            group: this.groupObject,
            zOrder: this.zOrder,
            rotation: 0,
        }));

        return {
            objectType: ObjectType.SHAPE,
            shapeType: this.shapeType,
            clientID: this.clientID,
            serverID: this._serverId ?? null,
            parentID: this._parentId ?? null,
            points: this.points,
            zOrder: this.zOrder,
            rotation: 0,
            attributes: Object.fromEntries(this.attributes),
            descriptions: [...this.descriptions],
            elements,
            label: this.label,
            group: this.groupObject,
            color: this.color,
            updated: Math.max(this.updated, ...this.elements.map((element) => element.updated)),
            pinned: this.pinned,
            outside: elements.every((el) => el.outside),
            occluded: elements.every((el) => el.occluded),
            lock: elements.every((el) => el.lock),
            hidden: elements.every((el) => el.hidden),
            frame,
            source: this.source,
            score: this.score,
            votes: this.votes,
            __internal: this.withContext(),
        };
    }

    public updateFromServerResponse(
        body: Parameters<typeof Shape.prototype.updateFromServerResponse>[0] & {
            elements?: { id: number, label_id: number }[];
        },
    ): void {
        super.updateFromServerResponse(body);
        if ('elements' in body) {
            for (const element of body.elements) {
                const context = this.elements.find((_element: Shape) => _element.label.id === element.label_id);
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

    protected saveRotation(rotation, frame): void {
        const undoSkeletonPoints = this.elements.map((element) => element.points);
        const undoSource = this.source;
        const redoSource = this.readOnlyFields.includes('source') ? this.source : computeNewSource(this.source);

        const bbox = computeWrappingBox(undoSkeletonPoints.flat());
        const [cx, cy] = [bbox.x + bbox.width / 2, bbox.y + bbox.height / 2];
        for (const element of this.elements) {
            const { points } = element;
            const rotatedPoints = [];
            for (let i = 0; i < points.length; i += 2) {
                const [x, y] = [points[i], points[i + 1]];
                rotatedPoints.push(...rotatePoint(x, y, rotation, cx, cy));
            }

            element.points = rotatedPoints;
        }
        this.source = redoSource;

        const redoSkeletonPoints = this.elements.map((element) => element.points);
        this.history.do(
            HistoryActions.CHANGED_ROTATION,
            () => {
                for (let i = 0; i < this.elements.length; i++) {
                    this.elements[i].points = undoSkeletonPoints[i];
                    this.elements[i].updated = Date.now();
                }
                this.source = undoSource;
                this.updated = Date.now();
            },
            () => {
                for (let i = 0; i < this.elements.length; i++) {
                    this.elements[i].points = redoSkeletonPoints[i];
                    this.elements[i].updated = Date.now();
                }
                this.source = redoSource;
                this.updated = Date.now();
            },
            [this.clientID, ...this.elements.map((element) => element.clientID)],
            frame,
        );
    }

    public save(frame: number, data: ObjectState): ObjectState {
        if (this.lock && data.lock) {
            return new ObjectState(this.get(frame));
        }

        const updateElements = <K extends 'points' | 'occluded' | 'hidden' | 'lock'>(
            affectedElements: ObjectState[],
            action: HistoryActions,
            property: K,
        ): void => {
            const undoSkeletonProperties = this.elements.map((element): Shape[K] => element[property]);
            const undoSource = this.source;
            const redoSource = this.readOnlyFields.includes('source') ? this.source : computeNewSource(this.source);

            try {
                this.history.freeze(true);
                affectedElements.forEach((element, idx) => {
                    const annotationContext = this.elements[idx];
                    annotationContext.save(frame, element);
                });
            } finally {
                this.history.freeze(false);
            }

            const redoSkeletonProperties = this.elements.map((element): Shape[K] => element[property]);

            this.history.do(
                action,
                () => {
                    for (let i = 0; i < this.elements.length; i++) {
                        this.elements[i][property] = undoSkeletonProperties[i];
                        this.elements[i].updated = Date.now();
                    }
                    this.source = undoSource;
                    this.updated = Date.now();
                },
                () => {
                    for (let i = 0; i < this.elements.length; i++) {
                        this.elements[i][property] = redoSkeletonProperties[i];
                        this.elements[i].updated = Date.now();
                    }
                    this.source = redoSource;
                    this.updated = Date.now();
                },
                [this.clientID, ...affectedElements.map((element) => element.clientID)],
                frame,
            );
        };

        const updatedPoints = data.elements.filter((el) => el.updateFlags.points);
        const updatedOccluded = data.elements.filter((el) => el.updateFlags.occluded);
        const updatedHidden = data.elements.filter((el) => el.updateFlags.hidden);
        const updatedLock = data.elements.filter((el) => el.updateFlags.lock);

        updatedOccluded.forEach((el) => { el.updateFlags.occluded = false; });
        updatedHidden.forEach((el) => { el.updateFlags.hidden = false; });
        updatedLock.forEach((el) => { el.updateFlags.lock = false; });

        if (updatedPoints.length) {
            updateElements(updatedPoints, HistoryActions.CHANGED_POINTS, 'points');
        }

        if (updatedOccluded.length) {
            updatedOccluded.forEach((el) => { el.updateFlags.occluded = true; });
            updateElements(updatedOccluded, HistoryActions.CHANGED_OCCLUDED, 'occluded');
        }

        if (updatedHidden.length) {
            updatedHidden.forEach((el) => { el.updateFlags.hidden = true; });
            updateElements(updatedHidden, HistoryActions.CHANGED_OUTSIDE, 'hidden');
        }

        if (updatedLock.length) {
            updatedLock.forEach((el) => { el.updateFlags.lock = true; });
            updateElements(updatedLock, HistoryActions.CHANGED_LOCK, 'lock');
        }

        const result = Shape.prototype.save.call(this, frame, data);
        return result;
    }
}
