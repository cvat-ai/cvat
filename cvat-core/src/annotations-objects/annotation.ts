// Copyright (C) 2019-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import ObjectState from '../object-state';
import { checkObjectType } from '../common';
import { ArgumentError } from '../exceptions';
import { Label } from '../labels';
import {
    colors, Source, HistoryActions, DimensionType, JobType,
} from '../enums';
import type {
    SerializedShape, SerializedTrack, SerializedTag,
} from '../server-response-types';
import {
    attrsAsAnObject, validateAttributeValue,
} from '../object-utils';
import type { AnnotationInjection, TrackedShape } from './types';
import {
    computeNewSource, defaultGroupColor, serverAttributesToDictionary,
} from './utils';

export class InterpolationNotPossibleError extends Error {}

export class Annotation {
    public clientID: number;
    protected taskLabels: Record<number, Label>;
    protected history: any;
    protected groupColors: Record<number, string>;
    public serverID: number | null;
    protected parentID: number | null;
    protected dimension: DimensionType;
    protected jobType: JobType;
    public group: number;
    public label: Label;
    public frame: number;
    private _removed: boolean;
    public lock: boolean;
    protected readOnlyFields: string[];
    protected color: string;
    public source: Source;
    public score: number;
    public votes: number;
    public updated: number;
    public attributes: Record<number, string>;
    protected groupObject: {
        color: string;
        readonly id: number;
    };

    constructor(data, clientID: number, color: string, injection: AnnotationInjection) {
        this.taskLabels = injection.labels;
        this.history = injection.history;
        this.groupColors = injection.groupColors;
        this.clientID = clientID;
        this.serverID = data.id || null;
        this.parentID = injection.parentID || null;
        this.dimension = injection.dimension;
        this.group = data.group;
        this.label = this.taskLabels[data.label_id];
        this.frame = data.frame;
        this._removed = false;
        this.lock = false;
        this.readOnlyFields = injection.readOnlyFields || [];
        this.color = color;
        this.source = injection.jobType === JobType.GROUND_TRUTH ? Source.GT : data.source;
        this.score = data.score;
        this.votes = injection.replicasCount !== undefined ?
            Math.round(this.score * injection.replicasCount) : 0;
        this.updated = Date.now();
        this.attributes = serverAttributesToDictionary(data.attributes);
        this.groupObject = Object.defineProperties(
            {}, {
                color: {
                    get: () => {
                        if (this.group) {
                            return this.groupColors[this.group] || colors[this.group % colors.length];
                        }
                        return defaultGroupColor;
                    },
                    set: (newColor) => {
                        if (this.group && typeof newColor === 'string' && /^#[0-9A-F]{6}$/i.test(newColor)) {
                            this.groupColors[this.group] = newColor;
                            this.updated = Date.now();
                        }
                    },
                },
                id: {
                    get: () => this.group,
                },
            },
        ) as Annotation['groupObject'];

        this.appendDefaultAttributes(this.label);
        // eslint-disable-next-line no-param-reassign
        injection.groups.max = Math.max(injection.groups.max, this.group);
    }

    protected withContext(_: number): {
        delete: Annotation['delete'];
    } {
        return {
            delete: this.delete.bind(this),
        };
    }

    protected saveLock(lock: boolean, frame: number): void {
        const undoLock = this.lock;
        const redoLock = lock;

        this.history.do(
            HistoryActions.CHANGED_LOCK,
            () => {
                this.lock = undoLock;
                this.updated = Date.now();
            },
            () => {
                this.lock = redoLock;
                this.updated = Date.now();
            },
            [this.clientID],
            frame,
        );

        this.lock = lock;
    }

    protected saveColor(color: string, frame: number): void {
        const undoColor = this.color;
        const redoColor = color;

        this.history.do(
            HistoryActions.CHANGED_COLOR,
            () => {
                this.color = undoColor;
                this.updated = Date.now();
            },
            () => {
                this.color = redoColor;
                this.updated = Date.now();
            },
            [this.clientID],
            frame,
        );

        this.color = color;
    }

    protected saveLabel(label: Label, frame: number): void {
        const undoLabel = this.label;
        const redoLabel = label;
        const undoAttributes = { ...this.attributes };
        const undoSource = this.source;
        const redoSource = this.readOnlyFields.includes('source') ? this.source : computeNewSource(this.source);

        this.label = label;
        this.source = redoSource;
        this.attributes = {};
        this.appendDefaultAttributes(label);

        // Try to keep old attributes if name matches and old value is still valid
        for (const attribute of redoLabel.attributes) {
            for (const oldAttribute of undoLabel.attributes) {
                if (
                    attribute.name === oldAttribute.name &&
                    validateAttributeValue(undoAttributes[oldAttribute.id], attribute)
                ) {
                    this.attributes[attribute.id] = undoAttributes[oldAttribute.id];
                }
            }
        }
        const redoAttributes = { ...this.attributes };

        this.history.do(
            HistoryActions.CHANGED_LABEL,
            () => {
                this.label = undoLabel;
                this.attributes = undoAttributes;
                this.source = undoSource;
                this.updated = Date.now();
            },
            () => {
                this.label = redoLabel;
                this.attributes = redoAttributes;
                this.source = redoSource;
                this.updated = Date.now();
            },
            [this.clientID],
            frame,
        );
    }

    protected saveAttributes(attributes: Record<number, string>, frame: number): void {
        const undoAttributes = { ...this.attributes };

        for (const attrID of Object.keys(attributes)) {
            this.attributes[attrID] = attributes[attrID];
        }

        const redoAttributes = { ...this.attributes };

        this.history.do(
            HistoryActions.CHANGED_ATTRIBUTES,
            () => {
                this.attributes = undoAttributes;
                this.updated = Date.now();
            },
            () => {
                this.attributes = redoAttributes;
                this.updated = Date.now();
            },
            [this.clientID],
            frame,
        );
    }

    protected validateStateBeforeSave(data: ObjectState, updated: ObjectState['updateFlags']): void {
        if (updated.label) {
            checkObjectType('label', data.label, null, { cls: Label, name: 'Label' });
        }

        const labelAttributes = attrsAsAnObject(data.label.attributes);
        if (updated.attributes) {
            for (const attrID of Object.keys(data.attributes)) {
                const value = data.attributes[attrID];
                if (attrID in labelAttributes) {
                    if (!validateAttributeValue(value, labelAttributes[attrID])) {
                        throw new ArgumentError(
                            `Trying to save an attribute attribute with id ${attrID} and invalid value ${value}`,
                        );
                    }
                } else {
                    throw new ArgumentError(
                        `The label of the shape doesn't have the attribute with id ${attrID} and value ${value}`,
                    );
                }
            }
        }

        if (updated.descriptions) {
            if (!Array.isArray(data.descriptions) || data.descriptions.some((desc) => typeof desc !== 'string')) {
                throw new ArgumentError(
                    `Descriptions are expected to be an array of strings but got ${data.descriptions}`,
                );
            }
        }

        if (updated.occluded) {
            checkObjectType('occluded', data.occluded, 'boolean');
        }

        if (updated.outside) {
            checkObjectType('outside', data.outside, 'boolean');
        }

        if (updated.zOrder) {
            checkObjectType('zOrder', data.zOrder, 'integer');
        }

        if (updated.lock) {
            checkObjectType('lock', data.lock, 'boolean');
        }

        if (updated.pinned) {
            checkObjectType('pinned', data.pinned, 'boolean');
        }

        if (updated.color) {
            checkObjectType('color', data.color, 'string');
            if (!/^#[0-9A-F]{6}$/i.test(data.color)) {
                throw new ArgumentError(`Got invalid color value: "${data.color}"`);
            }
        }

        if (updated.hidden) {
            checkObjectType('hidden', data.hidden, 'boolean');
        }

        if (updated.keyframe) {
            checkObjectType('keyframe', data.keyframe, 'boolean');
            const tracksShapeContext = this as Annotation & { shapes?: Record<number, TrackedShape> };
            if (
                tracksShapeContext.shapes &&
                Object.keys(tracksShapeContext.shapes).length === 1 &&
                data.frame in tracksShapeContext.shapes &&
                !data.keyframe
            ) {
                throw new ArgumentError(
                    `Can not remove the latest keyframe of an object "${data.label.name}".` +
                    'Consider removing the object instead',
                );
            }
        }
    }

    public clearServerID(): void {
        this.serverID = undefined;
    }

    public updateFromServerResponse(body: SerializedShape | SerializedTag | SerializedTrack): void {
        this.serverID = body.id;
    }

    protected appendDefaultAttributes(label: Label): void {
        const labelAttributes = label.attributes;
        for (const attribute of labelAttributes) {
            if (!(attribute.id in this.attributes)) {
                this.attributes[attribute.id] = attribute.defaultValue;
            }
        }
    }

    protected updateTimestamp(updated: ObjectState['updateFlags']): void {
        const anyChanges = Object.keys(updated).some((key) => !!updated[key]);
        if (anyChanges) {
            this.updated = Date.now();
        }
    }

    public delete(frame: number, force: boolean): boolean {
        if (!this.lock || force) {
            this.removed = true;
            this.history.do(
                HistoryActions.REMOVED_OBJECT,
                () => {
                    this.removed = false;
                    this.updated = Date.now();
                },
                () => {
                    this.removed = true;
                    this.updated = Date.now();
                },
                [this.clientID],
                frame,
            );
        }

        return this.removed;
    }

    public get removed(): boolean {
        return this._removed;
    }

    public set removed(value: boolean) {
        if (value) {
            this.clearServerID();
        }
        this._removed = value;
    }
}
