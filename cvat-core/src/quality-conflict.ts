// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

export enum QualityConflictType {
    EXTRA = 'extra_annotation',
    MISMATCHING = 'mismatching_label',
    MISSING = 'missing_annotation',
}

export enum ConflictImportance {
    ERROR = 'error',
    WARNING = 'warning',
}

export interface RawQualityConflictData {
    id?: number;
    frame?: number;
    type?: string;
    annotation_ids?: RawAnnotationConflictData[];
    data?: string;
    importance?: string;
}

export interface RawAnnotationConflictData {
    job_id?: number;
    obj_id?: number;
    type?: string;
    conflict_type?: string;
    importance?: string;
}

export class AnnotationConflict {
    public readonly jobId: number;
    public readonly objId: number;
    public readonly type: string;
    public readonly conflictType: QualityConflictType;
    public readonly importance: ConflictImportance;
    public readonly description: string;

    constructor(initialData: RawAnnotationConflictData) {
        const data: RawAnnotationConflictData = {
            job_id: undefined,
            obj_id: undefined,
            type: undefined,
            conflict_type: undefined,
            importance: undefined,
        };

        for (const property in data) {
            if (Object.prototype.hasOwnProperty.call(data, property) && property in initialData) {
                data[property] = initialData[property];
            }
        }

        Object.defineProperties(
            this,
            Object.freeze({
                jobId: {
                    get: () => data.job_id,
                },
                objId: {
                    get: () => data.obj_id,
                },
                type: {
                    get: () => data.type,
                },
                conflictType: {
                    get: () => data.conflict_type,
                },
                importance: {
                    get: () => data.importance,
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
    public readonly importance: ConflictImportance;
    public readonly description: string;

    constructor(initialData: RawQualityConflictData) {
        const data: RawQualityConflictData = {
            id: undefined,
            frame: undefined,
            type: undefined,
            annotation_ids: [],
            importance: undefined,
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
                importance: data.importance,
            }));

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
                importance: {
                    get: () => data.importance,
                },
                description: {
                    get: () => {
                        const desc = this.type.split('_').join(' ');
                        return desc.charAt(0).toUpperCase() + desc.slice(1);
                    },
                },
            }),
        );
    }
}
