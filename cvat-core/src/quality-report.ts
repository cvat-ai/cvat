// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { SerializedQualityReportData } from './server-response-types';
import User from './user';

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
    #parentID: number;
    #taskID: number;
    #jobID: number;
    #target: string;
    #createdDate: string;
    #gtLastUpdated: string;
    #assignee: User | null;
    #summary: Partial<SerializedQualityReportData['summary']>;

    constructor(initialData: SerializedQualityReportData) {
        this.#id = initialData.id;
        this.#parentID = initialData.parent_id;
        this.#taskID = initialData.task_id;
        this.#jobID = initialData.job_id;
        this.#target = initialData.target;
        this.#gtLastUpdated = initialData.gt_last_updated;
        this.#createdDate = initialData.created_date;
        this.#summary = initialData.summary;

        if (initialData.assignee) {
            this.#assignee = new User(initialData.assignee);
        } else {
            this.#assignee = null;
        }
    }

    get id(): number {
        return this.#id;
    }

    get parentID(): number {
        return this.#parentID;
    }

    get taskID(): number {
        return this.#taskID;
    }

    get jobID(): number {
        return this.#jobID;
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

    get assignee(): User | null {
        return this.#assignee;
    }

    get summary(): QualitySummary {
        return {
            frameCount: this.#summary.frame_count,
            frameSharePercent: this.#summary.frame_share * 100,
            conflictCount: this.#summary.conflict_count,
            validCount: this.#summary.valid_count,
            dsCount: this.#summary.ds_count,
            gtCount: this.#summary.gt_count,
            accuracy: (this.#summary.valid_count / this.#summary.total_count) * 100,
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
