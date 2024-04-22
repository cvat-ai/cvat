// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

export interface SerializedQualityReportData {
    id?: number;
    parent_id?: number;
    task_id?: number;
    job_id?: number;
    target: string;
    created_date?: string;
    gt_last_updated?: string;
    summary?: {
        frame_count: number,
        frame_share: number,
        conflict_count: number,
        valid_count: number,
        ds_count: number,
        gt_count: number,
        error_count: number,
        warning_count: number,
        conflicts_by_type: {
            extra_annotation: number,
            missing_annotation: number,
            mismatching_label: number,
            low_overlap: number,
            mismatching_direction: number,
            mismatching_attributes: number,
            mismatching_groups: number,
            covered_annotation: number,
        }
    };
}

export interface QualitySummary {
    frameCount: number;
    frameSharePercent: number;
    conflictCount: number;
    validCount: number;
    dsCount: number;
    gtCount: number;
    accuracy: number;
    precision: number;
    recall: number;
    errorCount: number;
    warningCount: number;
    conflictsByType: {
        extraAnnotations: number;
        missingAnnotations: number;
        mismatchingLabel: number;
        lowOverlap: number;
        mismatchingDirection: number;
        mismatchingAttributes: number;
        mismatchingGroups: number;
        coveredAnnotation: number;
    }
}

export default class QualityReport {
    #id: number;
    #parentId: number;
    #taskId: number;
    #jobId: number;
    #target: string;
    #createdDate: string;
    #gtLastUpdated: string;
    #summary: Partial<SerializedQualityReportData['summary']>;

    constructor(initialData: SerializedQualityReportData) {
        this.#id = initialData.id;
        this.#parentId = initialData.parent_id;
        this.#taskId = initialData.task_id;
        this.#jobId = initialData.job_id;
        this.#target = initialData.target;
        this.#gtLastUpdated = initialData.gt_last_updated;
        this.#createdDate = initialData.created_date;
        this.#summary = initialData.summary;
    }

    get id(): number {
        return this.#id;
    }

    get parentId(): number {
        return this.#parentId;
    }

    get taskId(): number {
        return this.#taskId;
    }

    get jobId(): number {
        return this.#jobId;
    }

    get target(): string {
        return this.#target;
    }

    get gtLastUpdated(): string {
        return this.#gtLastUpdated;
    }

    get createdDate(): string {
        return this.#createdDate;
    }

    get summary(): QualitySummary {
        return {
            frameCount: this.#summary.frame_count,
            frameSharePercent: this.#summary.frame_share * 100,
            conflictCount: this.#summary.conflict_count,
            validCount: this.#summary.valid_count,
            dsCount: this.#summary.ds_count,
            gtCount: this.#summary.gt_count,
            accuracy: (this.#summary.valid_count /
                (this.#summary.ds_count + this.#summary.gt_count - this.#summary.valid_count)) * 100,
            precision: (this.#summary.valid_count / this.#summary.gt_count) * 100,
            recall: (this.#summary.valid_count / this.#summary.ds_count) * 100,
            conflictsByType: {
                extraAnnotations: this.#summary.conflicts_by_type?.extra_annotation,
                missingAnnotations: this.#summary.conflicts_by_type?.missing_annotation,
                mismatchingLabel: this.#summary.conflicts_by_type?.mismatching_label,
                lowOverlap: this.#summary.conflicts_by_type?.low_overlap,
                mismatchingDirection: this.#summary.conflicts_by_type?.mismatching_direction,
                mismatchingAttributes: this.#summary.conflicts_by_type?.mismatching_attributes,
                mismatchingGroups: this.#summary.conflicts_by_type?.mismatching_groups,
                coveredAnnotation: this.#summary.conflicts_by_type?.covered_annotation,
            },
            errorCount: this.#summary.error_count,
            warningCount: this.#summary.warning_count,
        };
    }
}
