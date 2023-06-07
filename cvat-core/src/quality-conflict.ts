// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

export enum QualityConflictType {
    EXTRA = 'extra_annotation',
    MISMATCHING = 'mismatching_label',
    MISSING = 'missing_annotation',
}

export enum ConflictSeverity {
    ERROR = 'error',
    WARNING = 'warning',
}

export interface RawQualityConflictData {
    id?: number;
    frame?: number;
    type?: string;
    annotation_ids?: RawAnnotationConflictData[];
    data?: string;
    severity?: string;
    description?: string;
}

export interface RawAnnotationConflictData {
    job_id?: number;
    obj_id?: number;
    client_id?: number;
    type?: string;
    conflict_type?: string;
    severity?: string;
}

export class AnnotationConflict {
    public readonly jobID: number;
    public readonly serverID: number;
    public clientID: number;
    public readonly type: string;
    public readonly conflictType: QualityConflictType;
    public readonly severity: ConflictSeverity;
    public readonly description: string;

    constructor(initialData: RawAnnotationConflictData) {
        const data: RawAnnotationConflictData = {
            job_id: undefined,
            obj_id: undefined,
            client_id: undefined,
            type: undefined,
            conflict_type: undefined,
            severity: undefined,
        };

        for (const property in data) {
            if (Object.prototype.hasOwnProperty.call(data, property) && property in initialData) {
                data[property] = initialData[property];
            }
        }

        Object.defineProperties(
            this,
            Object.freeze({
                jobID: {
                    get: () => data.job_id,
                },
                serverID: {
                    get: () => data.obj_id,
                },
                clientID: {
                    get: () => data.client_id,
                    set: (newID: number) => {
                        data.client_id = newID;
                    },
                },
                type: {
                    get: () => data.type,
                },
                conflictType: {
                    get: () => data.conflict_type,
                },
                severity: {
                    get: () => data.severity,
                },
                description: {
                    get: () => {
                        const desc = this.conflictType.split('_').join(' ');
                        return desc.charAt(0).toUpperCase() + desc.slice(1);
                    },
                },
            }),
        );
    }
}

export default class QualityConflict {
    public readonly id: number;
    public readonly frame: number;
    public readonly type: QualityConflictType;
    public readonly annotationConflicts: AnnotationConflict[];
    public readonly severity: ConflictSeverity;
    public description: string;

    constructor(initialData: RawQualityConflictData) {
        const data: RawQualityConflictData = {
            id: undefined,
            frame: undefined,
            type: undefined,
            annotation_ids: [],
            severity: undefined,
            description: undefined,
        };

        for (const property in data) {
            if (Object.prototype.hasOwnProperty.call(data, property) && property in initialData) {
                data[property] = initialData[property];
            }
        }

        data.annotation_ids = data.annotation_ids
            .map((rawData: RawAnnotationConflictData) => new AnnotationConflict({
                ...rawData,
                conflict_type: data.type,
                severity: data.severity,
            }));

        const desc = data.type.split('_').join(' ');
        data.description = desc.charAt(0).toUpperCase() + desc.slice(1);

        Object.defineProperties(
            this,
            Object.freeze({
                id: {
                    get: () => data.id,
                },
                frame: {
                    get: () => data.frame,
                },
                type: {
                    get: () => data.type,
                },
                annotationConflicts: {
                    get: () => data.annotation_ids,
                },
                severity: {
                    get: () => data.severity,
                },
                description: {
                    get: () => data.description,
                    set: (newDescription) => {
                        data.description = newDescription;
                    },
                },
            }),
        );
    }
}
