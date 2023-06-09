// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

export interface RawQualityReportData {
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
    public readonly id: number;
    public readonly parentId: number;
    public readonly taskId: number;
    public readonly jobId: number;
    public readonly target: string;
    public readonly createdDate: string;
    public readonly gtLastUpdated: string;
    public readonly summary: QualitySummary;

    constructor(initialData: RawQualityReportData) {
        const data: RawQualityReportData = {
            id: undefined,
            parent_id: undefined,
            task_id: undefined,
            job_id: undefined,
            target: '',
            gt_last_updated: undefined,
            summary: undefined,
            created_date: undefined,
        };

        for (const property in data) {
            if (Object.prototype.hasOwnProperty.call(data, property) && property in initialData) {
                data[property] = initialData[property];
            }
        }

        Object.defineProperties(
            this,
            Object.freeze({
                id: {
                    get: () => data.id,
                },
                parentId: {
                    get: () => data.parent_id,
                },
                taskId: {
                    get: () => data.task_id,
                },
                jobId: {
                    get: () => data.job_id,
                },
                target: {
                    get: () => data.target,
                },
                gtLastUpdated: {
                    get: () => data.gt_last_updated,
                },
                summary: {
                    get: () => ({
                        frameCount: data.summary.frame_count,
                        frameSharePercent: data.summary.frame_share * 100,
                        conflictCount: data.summary.conflict_count,
                        validCount: data.summary.valid_count,
                        dsCount: data.summary.ds_count,
                        gtCount: data.summary.gt_count,
                        accuracy: (data.summary.valid_count /
                            (data.summary.ds_count + data.summary.gt_count - data.summary.valid_count)) * 100,
                        precision: (data.summary.valid_count / data.summary.gt_count) * 100,
                        recall: (data.summary.valid_count / data.summary.ds_count) * 100,
                        conflictsByType: {
                            extraAnnotations: data.summary.conflicts_by_type?.extra_annotation,
                            missingAnnotations: data.summary.conflicts_by_type?.missing_annotation,
                            mismatchingLabel: data.summary.conflicts_by_type?.mismatching_label,
                            lowOverlap: data.summary.conflicts_by_type?.low_overlap,
                            mismatchingDirection: data.summary.conflicts_by_type?.mismatching_direction,
                            mismatchingAttributes: data.summary.conflicts_by_type?.mismatching_attributes,
                            mismatchingGroups: data.summary.conflicts_by_type?.mismatching_groups,
                            coveredAnnotation: data.summary.conflicts_by_type?.covered_annotation,
                        },
                        errorCount: data.summary.error_count,
                        warningCount: data.summary.warning_count,
                    }),
                },
                createdDate: {
                    get: () => data.created_date,
                },
            }),
        );
    }
}
