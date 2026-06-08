// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import type { SerializedInterval } from '../server-response-types';
import { HistoryActions, ObjectType } from '../enums';
import { AnnotationBase } from './annotation-common';
import { AudioIntervalState } from './audio-interval-state';
import type { AnnotationInjection } from './types';
import { ScoredMixin } from './scored';
import { serializeAttributes } from './utils';

export class AudioInterval extends ScoredMixin(AnnotationBase) {
    public start: number;
    public stop: number | null;

    public static distance(start: number, stop: number, position: number): number | null {
        if (position < start || position > stop) {
            return null;
        }

        return Math.min(Math.abs(position - start), Math.abs(position - stop));
    }

    constructor(data: SerializedInterval, clientID: number, color: string, injection: AnnotationInjection) {
        super(data, clientID, color, injection);
        this.start = data.start;
        this.stop = data.stop;
    }

    protected withContext(): ReturnType<AnnotationBase['withContext']> & {
        save: (data: AudioIntervalState) => AudioIntervalState;
        export: () => SerializedInterval;
    } {
        return {
            delete: this.delete.bind(this),
            save: this.save.bind(this),
            export: this.toJSON.bind(this),
        };
    }

    protected savePosition(start: number, stop: number | null): void {
        const undoStart = this.start;
        const undoStop = this.stop;
        this.start = start;
        this.stop = stop;

        this.history.do(
            HistoryActions.CHANGED_AUDIO_POSITION,
            () => {
                this.start = undoStart;
                this.stop = undoStop;
                this.updated = Date.now();
            },
            () => {
                this.start = start;
                this.stop = stop;
                this.updated = Date.now();
            },
            [this.clientID],
            null,
        );
    }

    public toJSON(): SerializedInterval {
        const result: SerializedInterval = {
            clientID: this.clientID,
            label_id: this.label.id,
            start: this.start,
            stop: this.stop,
            group: this.groupObject.id,
            source: this.source,
            score: this.score,
            attributes: serializeAttributes(this.attributes),
        };

        if (typeof this._serverId === 'number') {
            result.id = this._serverId;
        }

        return result;
    }

    public get(): AudioIntervalState {
        return new AudioIntervalState({
            objectType: ObjectType.INTERVAL,
            clientID: this.clientID,
            serverID: this._serverId ?? null,
            label: this.label,
            start: this.start,
            stop: this.stop,
            color: this.color,
            lock: this.lock,
            hidden: this.hidden,
            updated: this.updated,
            source: this.source,
            score: this.score,
            votes: this.votes,
            attributes: Object.fromEntries(this.attributes),
            __internal: this.withContext(),
        });
    }

    public updateFromServerResponse(body: { id: number }): void {
        this._serverId = body.id;
    }

    public save(data: AudioIntervalState): AudioIntervalState {
        if (this.lock && data.lock) {
            return this.get();
        }

        const updated = data.updateFlags;
        for (const readOnlyField of this.readOnlyFields) {
            delete updated[readOnlyField];
        }

        // this.validateStateBeforeSave(data, updated);

        if (updated.label) {
            this.saveLabel(data.label, null);
        }

        if (updated.attributes) {
            this.saveAttributes(data.attributes, null);
        }

        if (updated.lock) {
            this.saveLock(data.lock, null);
        }

        if (updated.color) {
            this.saveColor(data.color, null);
        }

        if (updated.position) {
            this.savePosition(data.start, data.stop);
        }

        if (updated.hidden) {
            this.saveHidden(data.hidden, null);
        }

        this.updateTimestamp(updated);
        updated.reset();

        return this.get();
    }
}
