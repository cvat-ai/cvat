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
        frame_share_percent: number,
        conflicts_count: number,
        valid_count: number,
        ds_count: number,
        gt_count: number
    };
    parameters?: object;
}

export interface QualitySummary {
    frameCount: number;
    frameSharePercent: number;
    conflictsCount: number;
    validCount: number;
    dsCount: number;
    gtCount: number;
    accuracy: number;
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
    public readonly parameters: object;

    constructor(initialData: RawQualityReportData) {
        const data: RawQualityReportData = {
            id: undefined,
            parent_id: undefined,
            task_id: undefined,
            job_id: undefined,
            target: '',
            gt_last_updated: undefined,
            summary: undefined,
            parameters: {},
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
                        frameSharePercent: data.summary.frame_share_percent,
                        conflictsCount: data.summary.conflicts_count,
                        validCount: data.summary.valid_count,
                        dsCount: data.summary.ds_count,
                        gtCount: data.summary.gt_count,
                        accuracy: data.summary.valid_count /
                            (data.summary.ds_count + data.summary.gt_count - data.summary.valid_count),
                    }),
                },
                parameters: {
                    get: () => data.parameters,
                },
                createdDate: {
                    get: () => data.created_date,
                },
            }),
        );
    }
}
