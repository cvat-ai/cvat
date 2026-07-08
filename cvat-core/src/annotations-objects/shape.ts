// Copyright (C) 2019-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { omit } from 'lodash';
import ObjectState, { type SerializedData } from '../object-state';
import { ScriptingError } from '../exceptions';
import { ObjectType, HistoryActions } from '../enums';
import type { SerializedShape } from '../server-response-types';
import { computeNewSource, isChildObject, serializeAttributes } from './utils';
import { Drawn } from './drawn';
import type { AnnotationInjection } from './types';
import { ScoredMixin } from './scored';

export class Shape extends ScoredMixin(Drawn) {
    public points: number[];
    public occluded: boolean;
    public outside: boolean;
    public rotation: number;
    public zOrder: number;

    constructor(
        data: SerializedShape | SerializedShape['elements'][0],
        clientID: number,
        color: string,
        injection: AnnotationInjection,
    ) {
        super(data, clientID, color, injection);
        this.points = data.points;
        this.rotation = +(data.rotation ?? 0).toFixed(5);
        this.occluded = data.occluded || false;
        this.outside = data.outside || false;
        this.zOrder = data.z_order;
    }

    protected withContext(): ReturnType<Drawn['withContext']> & {
        save: (data: ObjectState) => ObjectState;
        export: () => SerializedShape;
    } {
        return {
            ...super.withContext(),
            save: this.save.bind(this),
            export: this.toJSON.bind(this),
        };
    }

    // Method is used to export data to the server
    public toJSON(): SerializedShape | SerializedShape['elements'][0] {
        const result: SerializedShape = {
            type: this.shapeType,
            clientID: this.clientID,
            occluded: this.occluded,
            outside: this.outside,
            z_order: this.zOrder,
            points: this.points.slice(),
            rotation: this.rotation,
            attributes: serializeAttributes(this.attributes),
            elements: [],
            frame: this.frame,
            label_id: this.label.id,
            group: this.group,
            source: this.source,
            score: this.score,
        };

        if (typeof this._serverId === 'number') {
            result.id = this._serverId;
        }

        if (isChildObject(this._parentId)) {
            return omit(result, 'elements');
        }

        return result;
    }

    public get(frame): { outside?: boolean } & Omit<Required<SerializedData>, 'keyframe' | 'keyframes' | 'elements' | 'outside'> {
        if (frame !== this.frame) {
            throw new ScriptingError('Received frame is not equal to the frame of the shape');
        }

        const result: ReturnType<Shape['get']> = {
            objectType: ObjectType.SHAPE,
            shapeType: this.shapeType,
            clientID: this.clientID,
            serverID: this._serverId ?? null,
            parentID: this._parentId ?? null,
            occluded: this.occluded,
            lock: this.lock,
            zOrder: this.zOrder,
            points: this.points.slice(),
            rotation: this.rotation,
            attributes: Object.fromEntries(this.attributes),
            descriptions: [...this.descriptions],
            label: this.label,
            group: this.groupObject,
            color: this.color,
            hidden: this.hidden,
            updated: this.updated,
            pinned: this.pinned,
            frame,
            source: this.source,
            score: this.score,
            votes: this.votes,
            __internal: this.withContext(),
        };

        if (typeof this.outside !== 'undefined') {
            result.outside = this.outside;
        }

        return result;
    }

    public updateFromServerResponse(body: { id: number }): void {
        this._serverId = body.id;
    }

    protected saveRotation(rotation: number, frame: number): void {
        const undoRotation = this.rotation;
        const redoRotation = rotation;
        const undoSource = this.source;
        const redoSource = this.readOnlyFields.includes('source') ? this.source : computeNewSource(this.source);

        this.history.do(
            HistoryActions.CHANGED_ROTATION,
            () => {
                this.source = undoSource;
                this.rotation = undoRotation;
                this.updated = Date.now();
            },
            () => {
                this.source = redoSource;
                this.rotation = redoRotation;
                this.updated = Date.now();
            },
            [this.clientID],
            frame,
        );

        this.source = redoSource;
        this.rotation = redoRotation;
    }

    protected savePoints(points: number[], frame: number): void {
        const undoPoints = this.points;
        const redoPoints = points;
        const undoSource = this.source;
        const redoSource = this.readOnlyFields.includes('source') ? this.source : computeNewSource(this.source);

        this.history.do(
            HistoryActions.CHANGED_POINTS,
            () => {
                this.points = undoPoints;
                this.source = undoSource;
                this.updated = Date.now();
            },
            () => {
                this.points = redoPoints;
                this.source = redoSource;
                this.updated = Date.now();
            },
            [this.clientID],
            frame,
        );

        this.source = redoSource;
        this.points = redoPoints;
    }

    protected saveOccluded(occluded: boolean, frame: number): void {
        const undoOccluded = this.occluded;
        const redoOccluded = occluded;
        const undoSource = this.source;
        const redoSource = this.readOnlyFields.includes('source') ? this.source : computeNewSource(this.source);

        this.history.do(
            HistoryActions.CHANGED_OCCLUDED,
            () => {
                this.occluded = undoOccluded;
                this.source = undoSource;
                this.updated = Date.now();
            },
            () => {
                this.occluded = redoOccluded;
                this.source = redoSource;
                this.updated = Date.now();
            },
            [this.clientID],
            frame,
        );

        this.source = redoSource;
        this.occluded = redoOccluded;
    }

    protected saveOutside(outside: boolean, frame: number): void {
        const undoOutside = this.outside;
        const redoOutside = outside;
        const undoSource = this.source;
        const redoSource = this.readOnlyFields.includes('source') ? this.source : computeNewSource(this.source);

        this.history.do(
            HistoryActions.CHANGED_OCCLUDED,
            () => {
                this.outside = undoOutside;
                this.source = undoSource;
                this.updated = Date.now();
            },
            () => {
                this.occluded = redoOutside;
                this.source = redoSource;
                this.updated = Date.now();
            },
            [this.clientID],
            frame,
        );

        this.source = redoSource;
        this.outside = redoOutside;
    }

    protected saveZOrder(zOrder: number, frame: number): void {
        const undoZOrder = this.zOrder;
        const redoZOrder = zOrder;
        const undoSource = this.source;
        const redoSource = this.readOnlyFields.includes('source') ? this.source : computeNewSource(this.source);

        this.history.do(
            HistoryActions.CHANGED_ZORDER,
            () => {
                this.zOrder = undoZOrder;
                this.source = undoSource;
                this.updated = Date.now();
            },
            () => {
                this.zOrder = redoZOrder;
                this.source = redoSource;
                this.updated = Date.now();
            },
            [this.clientID],
            frame,
        );

        this.source = redoSource;
        this.zOrder = redoZOrder;
    }

    public save(frame: number, data: ObjectState): ObjectState {
        if (frame !== this.frame) {
            throw new ScriptingError('Received frame is not equal to the frame of the shape');
        }

        if (this.lock && data.lock) {
            return new ObjectState(this.get(frame));
        }

        const updated = data.updateFlags;
        for (const readOnlyField of this.readOnlyFields) {
            delete updated[readOnlyField];
        }

        const fittedPoints = this.validateStateBeforeSave(data, updated, frame);
        const { rotation } = data;

        // Now when all fields are validated, we can apply them
        if (updated.label) {
            this.saveLabel(data.label, frame);
        }

        if (updated.attributes) {
            this.saveAttributes(data.attributes, frame);
        }

        if (updated.descriptions) {
            this.saveDescriptions(data.descriptions);
        }

        if (updated.rotation) {
            this.saveRotation(rotation, frame);
        }

        if (updated.points && fittedPoints.length) {
            this.savePoints(fittedPoints, frame);
        }

        if (updated.occluded) {
            this.saveOccluded(data.occluded, frame);
        }

        if (updated.outside) {
            this.saveOutside(data.outside, frame);
        }

        if (updated.zOrder) {
            this.saveZOrder(data.zOrder, frame);
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

        this.updateTimestamp(updated);
        updated.reset();

        return new ObjectState(this.get(frame));
    }
}
