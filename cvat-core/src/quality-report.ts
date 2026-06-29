// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { SerializedQualityReportData } from './server-response-types';
import User from './user';

export interface QualitySummary {
    totalFrames: number;
    validationFrames: number;
    validationFrameShare: number;
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
    tasks: {
        total: number;
        custom: number;
        notConfigured: number;
        excluded: number;
        included: number;
    } | null;
    jobs: {
        total: number;
        notCheckable: number;
        excluded: number;
        included: number;
    } | null;
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
            totalFrames: this.#summary.total_frames,
            validationFrames: this.#summary.validation_frames,
            validationFrameShare: this.#summary.validation_frame_share,
            conflictCount: this.#summary.conflict_count,
            validCount: this.#summary.valid_count,
            dsCount: this.#summary.ds_count,
            gtCount: this.#summary.gt_count,
            accuracy: this.#summary.accuracy,
            precision: this.#summary.precision,
            recall: this.#summary.recall,
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
            tasks: this.#summary.tasks ? {
                total: this.#summary.tasks.total,
                custom: this.#summary.tasks.custom,
                notConfigured: this.#summary.tasks.not_configured,
                excluded: this.#summary.tasks.excluded,
                included: this.#summary.tasks.included,
            } : null,
            jobs: this.#summary.jobs ? {
                total: this.#summary.jobs.total,
                notCheckable: this.#summary.jobs.not_checkable,
                excluded: this.#summary.jobs.excluded,
                included: this.#summary.jobs.included,
            } : null,
        };
    }
}
