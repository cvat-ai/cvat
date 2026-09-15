// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { type Label } from '../labels';
import {
    colors, Source, HistoryActions,
} from '../enums';
import { AnnotationContext } from './annotation-context';
import type { AnnotationInjection, CommonUpdateFlags } from './types';
import { computeNewSource, defaultGroupColor, deserializeAttributes } from './utils';

// Stores common annotation identity/state and field history mutations.
export class AnnotationBase extends AnnotationContext {
    private _removed: boolean;

    protected _serverId?: number;
    protected _parentId?: number;
    protected color: string;
    protected readOnlyFields: string[];
    protected groupObject: {
        color: string;
        readonly id: number;
    };

    public readonly clientID: number;
    public group: number;
    public label: Label;
    public lock: boolean;
    public hidden: boolean;
    public source: Source;
    public updated: number;
    public attributes: Map<number, string>;

    constructor(data, clientID: number, color: string, injection: AnnotationInjection) {
        super(injection);
        this._removed = false;

        this._serverId = data.id ?? undefined;
        this._parentId = injection.parentId ?? undefined;
        this.color = color;
        this.readOnlyFields = [];
        this.groupObject = Object.defineProperties(
            {}, {
                color: {
                    get: () => {
                        if (this.group) {
                            return this.groupsInfo.colors[this.group] || colors[this.group % colors.length];
                        }
                        return defaultGroupColor;
                    },
                    set: (newColor) => {
                        if (this.group && typeof newColor === 'string' && /^#[0-9A-F]{6}$/i.test(newColor)) {
                            this.groupsInfo.colors[this.group] = newColor;
                            this.updated = Date.now();
                        }
                    },
                },
                id: {
                    get: () => this.group,
                },
            },
        ) as AnnotationBase['groupObject'];

        this.clientID = clientID;
        this.group = data.group;
        this.label = this.labels[data.label_id];
        this.lock = false;
        this.hidden = false;
        this.source = data.source;
        this.updated = Date.now();
        this.attributes = deserializeAttributes(data.attributes);

        this.appendDefaultAttributes(this.label);
        // eslint-disable-next-line no-param-reassign
        injection.groupsInfo.max = Math.max(injection.groupsInfo.max, this.group);
    }

    protected saveLock(lock: boolean, frame: number | null): void {
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

    protected saveHidden(hidden: boolean, frame: number | null): void {
        const undoHidden = this.hidden;
        const redoHidden = hidden;

        this.history.do(
            HistoryActions.CHANGED_HIDDEN,
            () => {
                this.hidden = undoHidden;
                this.updated = Date.now();
            },
            () => {
                this.hidden = redoHidden;
                this.updated = Date.now();
            },
            [this.clientID],
            frame,
        );

        this.hidden = hidden;
    }

    protected saveColor(color: string, frame: number | null): void {
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

    protected saveLabel(label: Label, frame: number | null): void {
        const undoLabel = this.label;
        const redoLabel = label;
        const undoAttributes = new Map(this.attributes);
        const undoSource = this.source;
        const redoSource = this.readOnlyFields.includes('source') ? this.source : computeNewSource(this.source);

        this.label = label;
        this.source = redoSource;
        this.attributes = new Map();
        this.appendDefaultAttributes(label);
        const redoAttributes = new Map(this.attributes);

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

    protected saveAttributes(attributes: Record<number, string>, frame: number | null): void {
        const undoAttributes = new Map(this.attributes);
        for (const [id, value] of Object.entries(attributes)) {
            this.attributes.set(+id, value);
        }
        const redoAttributes = new Map(this.attributes);

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

    protected appendDefaultAttributes(label: Label): void {
        const labelAttributes = label.attributes;
        for (const attribute of labelAttributes) {
            if (typeof attribute.id === 'number' && !this.attributes.has(attribute.id)) {
                this.attributes.set(attribute.id, attribute.defaultValue);
            }
        }
    }

    public clearServerId(): void {
        this._serverId = undefined;
    }

    protected updateTimestamp<T extends CommonUpdateFlags>(updated: T): void {
        const anyChanges = Object.values(updated).some((value) => value);
        if (anyChanges) {
            this.updated = Date.now();
        }
    }

    protected withContext(): {
        delete: AnnotationBase['delete'];
    } {
        return {
            delete: this.delete.bind(this),
        };
    }

    public delete(frame: number | null, force: boolean): boolean {
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

    get removed(): boolean {
        return this._removed;
    }

    set removed(value: boolean) {
        if (value) {
            this.clearServerId();
        }

        this._removed = value;
    }

    get clientId(): number {
        return this.clientID;
    }

    get serverId(): number | undefined {
        return this._serverId;
    }

    set serverId(id: number | undefined) {
        this._serverId = id;
    }
}
