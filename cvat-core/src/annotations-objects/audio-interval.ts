// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import type { SerializedInterval } from '../server-response-types';
import { ObjectType } from '../enums';
import { AnnotationBase } from './annotation-common';
import type { AnnotationInjection, AudioIntervalState } from './types';
import { ScoredMixin } from './scored';

const ScoredAnnotationBase = ScoredMixin(AnnotationBase);

export class AudioInterval extends ScoredAnnotationBase {
    public start: number;
    public stop: number | null;

    constructor(data: SerializedInterval, clientID: number, color: string, injection: AnnotationInjection) {
        super(data, clientID, color, injection);
        this.start = data.start;
        this.stop = data.stop;
    }

    public get(): AudioIntervalState {
        return {
            objectType: ObjectType.INTERVAL,
            clientID: this.clientID,
            serverID: this._serverId ?? null,
            label: this.label,
            start: this.start,
            stop: this.stop,
            group: this.groupObject,
            color: this.color,
            lock: this.lock,
            hidden: this.hidden,
            updated: this.updated,
            source: this.source,
            score: this.score,
            votes: this.votes,
            attributes: Object.fromEntries(this.attributes),
        };
    }

    public updateFromServerResponse(body: { id: number }): void {
        this._serverId = body.id;
    }
}
