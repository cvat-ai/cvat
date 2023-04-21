// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

interface RawQualityReportData {
    id?: number;
    parent_id?: number;
    task_id?: number;
    job_id?: number;
    target: string;
    created_date?: string;
    gt_last_updated?: string;
    summary?: {
        mean_accuracy: number;
    };
    parameters?: object;
}

export interface QualitySummary {
    meanAccuracy: number;
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
                        meanAccuracy: data.summary.mean_accuracy,
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
