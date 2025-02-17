// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { SerializedAnnotationConflictData, SerializedQualityConflictData } from './server-response-types';
import { ObjectType } from './enums';

export enum QualityConflictType {
    EXTRA = 'extra_annotation',
    MISMATCHING = 'mismatching_label',
    MISSING = 'missing_annotation',
}

export enum ConflictSeverity {
    ERROR = 'error',
    WARNING = 'warning',
}

export class AnnotationConflict {
    #jobID: number;
    #serverID: number;
    #type: ObjectType;
    #shapeType: string | null;
    #conflictType: QualityConflictType;
    #severity: ConflictSeverity;
    #description: string;

    constructor(initialData: SerializedAnnotationConflictData) {
        this.#jobID = initialData.job_id;
        this.#serverID = initialData.obj_id;
        this.#type = initialData.type;
        this.#shapeType = initialData.shape_type;
        this.#conflictType = initialData.conflict_type as QualityConflictType;
        this.#severity = initialData.severity as ConflictSeverity;

        const desc = this.#conflictType.split('_').join(' ');
        this.#description = desc.charAt(0).toUpperCase() + desc.slice(1);
    }

    get jobID(): number {
        return this.#jobID;
    }

    get serverID(): number {
        return this.#serverID;
    }

    get type(): ObjectType {
        return this.#type;
    }

    get shapeType(): string | null {
        return this.#shapeType;
    }

    get conflictType(): QualityConflictType {
        return this.#conflictType;
    }

    get severity(): ConflictSeverity {
        return this.#severity;
    }

    get description(): string {
        return this.#description;
    }
}

export default class QualityConflict {
    #id: number;
    #frame: number;
    #type: QualityConflictType;
    #annotationConflicts: AnnotationConflict[];
    #severity: ConflictSeverity;
    #description: string;

    constructor(initialData: SerializedQualityConflictData) {
        this.#id = initialData.id;
        this.#frame = initialData.frame;
        this.#type = initialData.type as QualityConflictType;
        this.#severity = initialData.severity as ConflictSeverity;
        this.#annotationConflicts = initialData.annotation_ids
            .map((rawData: SerializedAnnotationConflictData) => new AnnotationConflict({
                ...rawData,
                conflict_type: initialData.type,
                severity: initialData.severity,
            }));

        const desc = initialData.type.split('_').join(' ');
        this.#description = desc.charAt(0).toUpperCase() + desc.slice(1);
    }

    get id(): number {
        return this.#id;
    }

    get frame(): number {
        return this.#frame;
    }

    get type(): QualityConflictType {
        return this.#type;
    }

    get annotationConflicts(): AnnotationConflict[] {
        return this.#annotationConflicts;
    }

    get severity(): ConflictSeverity {
        return this.#severity;
    }

    get description(): string {
        return this.#description;
    }

    set description(newDescription: string) {
        this.#description = newDescription;
    }
}
