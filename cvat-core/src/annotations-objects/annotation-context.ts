// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import type { AnnotationInjection } from './types';

// Stores shared annotation infrastructure injected by the collection.
// It intentionally has no behavior so derived classes can access context without owning object state.
export class AnnotationContext {
    protected labels: AnnotationInjection['labels'];
    protected groupsInfo: AnnotationInjection['groupsInfo'];
    protected framesInfo: AnnotationInjection['framesInfo'];
    protected history: AnnotationInjection['history'];
    protected dimension: AnnotationInjection['dimension'];
    protected jobType: AnnotationInjection['jobType'];
    protected replicasCount: AnnotationInjection['replicasCount'];
    protected nextClientID: AnnotationInjection['nextClientID'];
    protected getMasksOnFrame: AnnotationInjection['getMasksOnFrame'];

    constructor(injection: AnnotationInjection) {
        this.labels = injection.labels;
        this.groupsInfo = injection.groupsInfo;
        this.framesInfo = injection.framesInfo;
        this.history = injection.history;
        this.dimension = injection.dimension;
        this.jobType = injection.jobType;
        this.replicasCount = injection.replicasCount;
        this.nextClientID = injection.nextClientID;
        this.getMasksOnFrame = injection.getMasksOnFrame;
    }
}
