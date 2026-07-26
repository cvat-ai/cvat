// Copyright (C) 2019-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { omit } from 'lodash';
import ObjectState, { type SerializedData } from '../object-state';
import { ObjectType, HistoryActions } from '../enums';
import type { Label } from '../labels';
import type { SerializedTrack } from '../server-response-types';
import { attrsAsAnObject } from '../object-utils';
import { Drawn } from './drawn';
import { InterpolationNotPossibleError } from './image-object';
import type { AnnotationInjection, InterpolatedPosition, TrackedShape } from './types';
import {
    computeNewSource, deserializeTrackedShapes, copyShape, isChildObject, serializeAttributes,
} from './utils';

export class Track extends Drawn {
    public shapes: Record<number, TrackedShape>;
    constructor(
        data: SerializedTrack | SerializedTrack['elements'][0],
        clientID: number,
        color: string,
        injection: AnnotationInjection,
    ) {
        super(data, clientID, color, injection);
        this.shapes = deserializeTrackedShapes(data.shapes);
    }

    protected withContext(): ReturnType<Drawn['withContext']> & {
        save: (data: ObjectState) => ObjectState;
        export: () => SerializedTrack;
    } {
        return {
            ...super.withContext(),
            save: this.save.bind(this),
            export: this.toJSON.bind(this),
        };
    }

    // Method is used to export data to the server
    public toJSON(): SerializedTrack | SerializedTrack['elements'][0] {
        const labelAttributes = attrsAsAnObject(this.label.attributes);

        const result: SerializedTrack = {
            clientID: this.clientID,
            label_id: this.label.id,
            frame: this.frame,
            group: this.group,
            source: this.source,
            attributes: serializeAttributes(this.attributes)
                .filter((attr) => !labelAttributes[attr.spec_id].mutable),
            elements: [],
            shapes: Object.keys(this.shapes).reduce((shapesAccumulator, frame) => {
                shapesAccumulator.push({
                    type: this.shapeType,
                    occluded: this.shapes[frame].occluded,
                    z_order: this.shapes[frame].zOrder,
                    rotation: this.shapes[frame].rotation,
                    outside: this.shapes[frame].outside,
                    attributes: serializeAttributes(this.shapes[frame].attributes)
                        .filter((attr) => labelAttributes[attr.spec_id].mutable),
                    id: this.shapes[frame].serverId,
                    frame: +frame,
                });

                if (this.shapes[frame].points) {
                    // eslint-disable-next-line no-param-reassign
                    shapesAccumulator[shapesAccumulator.length - 1].points = [...this.shapes[frame].points];
                }

                return shapesAccumulator;
            }, []),
        };

        if (typeof this._serverId === 'number') {
            result.id = this._serverId;
        }

        if (isChildObject(this._parentId)) {
            return omit(result, 'elements');
        }

        return result;
    }

    public get(frame: number): Omit<Required<SerializedData>, 'elements' | 'score' | 'votes'> {
        const {
            prev, next, first, last,
        } = this.boundedKeyframes(frame);

        return {
            ...this.getPosition(frame, prev, next),
            attributes: this.getAttributes(frame),
            descriptions: [...this.descriptions],
            group: this.groupObject,
            objectType: ObjectType.TRACK,
            shapeType: this.shapeType,
            clientID: this.clientID,
            serverID: this._serverId ?? null,
            parentID: this._parentId ?? null,
            lock: this.lock,
            color: this.color,
            hidden: this.hidden,
            updated: this.updated,
            label: this.label,
            pinned: this.pinned,
            keyframes: {
                prev,
                next,
                first,
                last,
            },
            frame,
            source: this.source,
            __internal: this.withContext(),
        };
    }

    public boundedKeyframes(targetFrame: number): ObjectState['keyframes'] {
        const frames = Object.keys(this.shapes).map((frame) => +frame);
        let lDiff = Number.MAX_SAFE_INTEGER;
        let rDiff = Number.MAX_SAFE_INTEGER;
        let first = Number.MAX_SAFE_INTEGER;
        let last = Number.MIN_SAFE_INTEGER;

        for (const frame of frames) {
            if (this.framesInfo.isFrameDeleted(frame)) {
                continue;
            }

            if (frame < first) {
                first = frame;
            }
            if (frame > last) {
                last = frame;
            }

            const diff = Math.abs(targetFrame - frame);

            if (frame < targetFrame && diff < lDiff) {
                lDiff = diff;
            } else if (frame > targetFrame && diff < rDiff) {
                rDiff = diff;
            }
        }

        const prev = lDiff === Number.MAX_SAFE_INTEGER ? null : targetFrame - lDiff;
        const next = rDiff === Number.MAX_SAFE_INTEGER ? null : targetFrame + rDiff;

        return {
            prev,
            next,
            first,
            last,
        };
    }

    protected getAttributes(targetFrame: number): Record<number, string> {
        const result = {};

        // First of all copy all unmutable attributes
        for (const [id, value] of this.attributes.entries()) {
            result[id] = value;
        }

        // Secondly get latest mutable attributes up to target frame
        const frames = Object.keys(this.shapes).sort((a, b) => +a - +b);
        for (const frame of frames) {
            if (+frame <= targetFrame) {
                const { attributes } = this.shapes[frame];
                for (const [id, value] of attributes.entries()) {
                    result[id] = value;
                }
            }
        }

        return result;
    }

    public updateFromServerResponse(body: {
        id: number;
        frame: number;
        shapes: SerializedTrack['shapes'];
    }): void {
        this._serverId = body.id;
        this.frame = body.frame;
        this.shapes = deserializeTrackedShapes(body.shapes);
    }

    public clearServerId(): void {
        super.clearServerId();
        for (const shape of Object.values(this.shapes)) {
            shape.serverId = undefined;
        }
    }

    protected saveLabel(label: Label, frame: number): void {
        const undoLabel = this.label;
        const redoLabel = label;
        const undoSource = this.source;
        const redoSource = this.readOnlyFields.includes('source') ? this.source : computeNewSource(this.source);
        const undoAttributes = {
            unmutable: new Map(this.attributes),
            mutable: Object.keys(this.shapes).map((key) => ({
                frame: +key,
                attributes: new Map(this.shapes[+key].attributes),
            })),
        };

        this.label = label;
        this.source = redoSource;
        this.attributes = new Map();
        for (const shape of Object.values(this.shapes)) {
            shape.attributes = new Map();
        }
        this.appendDefaultAttributes(label);

        const redoAttributes = {
            unmutable: new Map(this.attributes),
            mutable: Object.keys(this.shapes).map((key) => ({
                frame: +key,
                attributes: new Map(this.shapes[+key].attributes),
            })),
        };

        this.history.do(
            HistoryActions.CHANGED_LABEL,
            () => {
                this.label = undoLabel;
                this.attributes = undoAttributes.unmutable;
                this.source = undoSource;
                for (const mutable of undoAttributes.mutable) {
                    this.shapes[mutable.frame].attributes = mutable.attributes;
                }
                this.updated = Date.now();
            },
            () => {
                this.label = redoLabel;
                this.attributes = redoAttributes.unmutable;
                this.source = redoSource;
                for (const mutable of redoAttributes.mutable) {
                    this.shapes[mutable.frame].attributes = mutable.attributes;
                }
                this.updated = Date.now();
            },
            [this.clientID],
            frame,
        );
    }

    protected saveAttributes(attributes: Record<number, string>, frame: number): void {
        const current = this.get(frame);
        const labelAttributes = attrsAsAnObject(this.label.attributes);

        const wasKeyframe = frame in this.shapes;
        const undoAttributes = new Map(this.attributes);
        const undoShape = wasKeyframe ? this.shapes[frame] : undefined;

        let mutableAttributesUpdated = false;
        const redoAttributes = new Map(this.attributes);
        for (const [attrID, attrValue] of Object.entries(attributes)) {
            if (!labelAttributes[attrID].mutable) {
                redoAttributes.set(+attrID, attrValue);
            } else if (attrValue !== current.attributes[attrID]) {
                mutableAttributesUpdated = mutableAttributesUpdated ||
                    // not keyframe yet
                    !(frame in this.shapes) ||
                    // keyframe, but without this attrID
                    !this.shapes[frame].attributes.has(+attrID) ||
                    // keyframe with attrID, but with another value
                    this.shapes[frame].attributes.get(+attrID) !== attrValue;
            }
        }
        let redoShape: TrackedShape | undefined;
        if (mutableAttributesUpdated) {
            if (wasKeyframe) {
                redoShape = {
                    ...this.shapes[frame],
                    attributes: new Map(this.shapes[frame].attributes),
                };
            } else {
                redoShape = copyShape(current);
            }
        }

        for (const [attrID, attrValue] of Object.entries(attributes)) {
            if (redoShape && labelAttributes[attrID].mutable && attrValue !== current.attributes[attrID]) {
                redoShape.attributes.set(+attrID, attrValue);
            }
        }

        this.attributes = redoAttributes;
        if (redoShape) {
            this.shapes[frame] = redoShape;
        }

        this.history.do(
            HistoryActions.CHANGED_ATTRIBUTES,
            () => {
                this.attributes = undoAttributes;
                if (undoShape) {
                    this.shapes[frame] = undoShape;
                } else if (redoShape) {
                    delete this.shapes[frame];
                }
                this.updated = Date.now();
            },
            () => {
                this.attributes = redoAttributes;
                if (redoShape) {
                    this.shapes[frame] = redoShape;
                }
                this.updated = Date.now();
            },
            [this.clientID],
            frame,
        );
    }

    protected appendShapeActionToHistory(actionType, frame, undoShape, redoShape, undoSource, redoSource): void {
        this.history.do(
            actionType,
            () => {
                if (!undoShape) {
                    delete this.shapes[frame];
                } else {
                    this.shapes[frame] = undoShape;
                }
                this.source = undoSource;
                this.updated = Date.now();
            },
            () => {
                if (!redoShape) {
                    delete this.shapes[frame];
                } else {
                    this.shapes[frame] = redoShape;
                }
                this.source = redoSource;
                this.updated = Date.now();
            },
            [this.clientID],
            frame,
        );
    }

    protected saveRotation(rotation: number, frame: number): void {
        const wasKeyframe = frame in this.shapes;
        const undoSource = this.source;
        const redoSource = this.readOnlyFields.includes('source') ? this.source : computeNewSource(this.source);
        const undoShape = wasKeyframe ? this.shapes[frame] : undefined;
        const redoShape = wasKeyframe ?
            { ...this.shapes[frame], rotation } : copyShape(this.get(frame), { rotation });

        this.shapes[frame] = redoShape;
        this.source = redoSource;
        this.appendShapeActionToHistory(
            HistoryActions.CHANGED_ROTATION,
            frame,
            undoShape,
            redoShape,
            undoSource,
            redoSource,
        );
    }

    protected savePoints(points: number[], frame: number): void {
        const wasKeyframe = frame in this.shapes;
        const undoSource = this.source;
        const redoSource = this.readOnlyFields.includes('source') ? this.source : computeNewSource(this.source);
        const undoShape = wasKeyframe ? this.shapes[frame] : undefined;
        const redoShape = wasKeyframe ?
            { ...this.shapes[frame], points } : copyShape(this.get(frame), { points });

        this.shapes[frame] = redoShape;
        this.source = redoSource;
        this.appendShapeActionToHistory(
            HistoryActions.CHANGED_POINTS,
            frame,
            undoShape,
            redoShape,
            undoSource,
            redoSource,
        );
    }

    protected saveOutside(frame: number, outside: boolean): void {
        const wasKeyframe = frame in this.shapes;
        const undoSource = this.source;
        const redoSource = this.readOnlyFields.includes('source') ? this.source : computeNewSource(this.source);
        const undoShape = wasKeyframe ? this.shapes[frame] : undefined;
        const redoShape = wasKeyframe ?
            { ...this.shapes[frame], outside } :
            copyShape(this.get(frame), { outside });

        this.shapes[frame] = redoShape;
        this.source = redoSource;
        this.appendShapeActionToHistory(
            HistoryActions.CHANGED_OUTSIDE,
            frame,
            undoShape,
            redoShape,
            undoSource,
            redoSource,
        );
    }

    protected saveOccluded(occluded: boolean, frame: number): void {
        const wasKeyframe = frame in this.shapes;
        const undoSource = this.source;
        const redoSource = this.readOnlyFields.includes('source') ? this.source : computeNewSource(this.source);
        const undoShape = wasKeyframe ? this.shapes[frame] : undefined;
        const redoShape = wasKeyframe ?
            { ...this.shapes[frame], occluded } :
            copyShape(this.get(frame), { occluded });

        this.shapes[frame] = redoShape;
        this.source = redoSource;
        this.appendShapeActionToHistory(
            HistoryActions.CHANGED_OCCLUDED,
            frame,
            undoShape,
            redoShape,
            undoSource,
            redoSource,
        );
    }

    protected saveZOrder(zOrder: number, frame: number): void {
        const wasKeyframe = frame in this.shapes;
        const undoSource = this.source;
        const redoSource = this.readOnlyFields.includes('source') ? this.source : computeNewSource(this.source);
        const undoShape = wasKeyframe ? this.shapes[frame] : undefined;
        const redoShape = wasKeyframe ?
            { ...this.shapes[frame], zOrder } :
            copyShape(this.get(frame), { zOrder });

        this.shapes[frame] = redoShape;
        this.source = redoSource;
        this.appendShapeActionToHistory(
            HistoryActions.CHANGED_ZORDER,
            frame,
            undoShape,
            redoShape,
            undoSource,
            redoSource,
        );
    }

    protected saveKeyframe(frame: number, keyframe: boolean): void {
        const wasKeyframe = frame in this.shapes;

        if ((keyframe && wasKeyframe) || (!keyframe && !wasKeyframe)) {
            return;
        }

        const undoSource = this.source;
        const redoSource = this.readOnlyFields.includes('source') ? this.source : computeNewSource(this.source);
        const undoShape = wasKeyframe ? this.shapes[frame] : undefined;
        const redoShape = keyframe ? copyShape(this.get(frame)) : undefined;

        this.source = redoSource;
        if (redoShape) {
            this.shapes[frame] = redoShape;
        } else {
            delete this.shapes[frame];
        }

        this.appendShapeActionToHistory(
            HistoryActions.CHANGED_KEYFRAME,
            frame,
            undoShape,
            redoShape,
            undoSource,
            redoSource,
        );
    }

    public save(frame: number, data: ObjectState): ObjectState {
        if (this.lock && data.lock) {
            return new ObjectState(this.get(frame));
        }

        const updated = data.updateFlags;
        for (const readOnlyField of this.readOnlyFields) {
            delete updated[readOnlyField];
        }

        const fittedPoints = this.validateStateBeforeSave(data, updated, frame);
        const { rotation } = data;

        if (updated.label) {
            this.saveLabel(data.label, frame);
        }

        if (updated.lock) {
            this.saveLock(data.lock, frame);
        }

        if (updated.pinned) {
            this.savePinned(data.pinned, frame);
        }

        if (updated.color) {
            this.saveColor(data.color, frame);
        }

        if (updated.hidden) {
            this.saveHidden(data.hidden, frame);
        }

        if (updated.points && fittedPoints.length) {
            this.savePoints(fittedPoints, frame);
        }

        if (updated.rotation) {
            this.saveRotation(rotation, frame);
        }

        if (updated.outside) {
            this.saveOutside(frame, data.outside);
        }

        if (updated.occluded) {
            this.saveOccluded(data.occluded, frame);
        }

        if (updated.zOrder) {
            this.saveZOrder(data.zOrder, frame);
        }

        if (updated.attributes) {
            this.saveAttributes(data.attributes, frame);
        }

        if (updated.descriptions) {
            this.saveDescriptions(data.descriptions);
        }

        if (updated.keyframe) {
            this.saveKeyframe(frame, data.keyframe);
        }

        this.updateTimestamp(updated);
        updated.reset();

        return new ObjectState(this.get(frame));
    }

    protected getPosition(
        targetFrame: number, leftKeyframe: number | null, rightFrame: number | null,
    ): InterpolatedPosition & { keyframe: boolean } {
        const leftFrame = targetFrame in this.shapes ? targetFrame : leftKeyframe;
        const rightPosition = Number.isInteger(rightFrame) ? this.shapes[rightFrame] : null;
        const leftPosition = Number.isInteger(leftFrame) ? this.shapes[leftFrame] : null;

        if (leftPosition && rightPosition) {
            return {
                ...(this as any).interpolatePosition(
                    leftPosition,
                    rightPosition,
                    (targetFrame - leftFrame) / (rightFrame - leftFrame),
                ),
                keyframe: targetFrame in this.shapes,
            };
        }

        const singlePosition = leftPosition || rightPosition;
        if (singlePosition) {
            return {
                points: [...singlePosition.points],
                rotation: singlePosition.rotation,
                occluded: singlePosition.occluded,
                zOrder: singlePosition.zOrder,
                keyframe: targetFrame in this.shapes,
                outside: singlePosition === rightPosition ? true : singlePosition.outside,
            };
        }

        throw new InterpolationNotPossibleError();
    }
}
