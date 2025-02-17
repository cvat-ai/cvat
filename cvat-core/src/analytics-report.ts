// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import {
    SerializedAnalyticsEntry, SerializedAnalyticsReport,
    SerializedDataEntry, SerializedTransformationEntry,
} from './server-response-types';
import { ArgumentError } from './exceptions';

export enum AnalyticsReportTarget {
    JOB = 'job',
    TASK = 'task',
    PROJECT = 'project',
}

export enum AnalyticsEntryViewType {
    HISTOGRAM = 'histogram',
    NUMERIC = 'numeric',
}

export class AnalyticsEntry {
    #name: string;
    #title: string;
    #description: string;
    #granularity: string;
    #defaultView: AnalyticsEntryViewType;
    #dataSeries: Record<string, SerializedDataEntry[]>;
    #transformations: SerializedTransformationEntry[];

    constructor(initialData: SerializedAnalyticsEntry) {
        this.#name = initialData.name;
        this.#title = initialData.title;
        this.#description = initialData.description;
        this.#granularity = initialData.granularity;
        this.#defaultView = initialData.default_view as AnalyticsEntryViewType;
        this.#transformations = initialData.transformations;
        this.#dataSeries = this.applyTransformations(initialData.data_series);
    }

    get name(): string {
        return this.#name;
    }

    get title(): string {
        return this.#title;
    }

    get description(): string {
        return this.#description;
    }

    // Probably need to create enum for this
    get granularity(): string {
        return this.#granularity;
    }

    get defaultView(): AnalyticsEntryViewType {
        return this.#defaultView;
    }

    get dataSeries(): Record<string, SerializedDataEntry[]> {
        return this.#dataSeries;
    }

    get transformations(): SerializedTransformationEntry[] {
        return this.#transformations;
    }

    private applyTransformations(
        dataSeries: Record<string, SerializedDataEntry[]>,
    ): Record<string, SerializedDataEntry[]> {
        this.#transformations.forEach((transform) => {
            if (transform.binary) {
                let operator: (left: number, right: number) => number;
                switch (transform.binary.operator) {
                    case '+': {
                        operator = (left: number, right: number) => left + right;
                        break;
                    }
                    case '-': {
                        operator = (left: number, right: number) => left - right;
                        break;
                    }
                    case '*': {
                        operator = (left: number, right: number) => left * right;
                        break;
                    }
                    case '/': {
                        operator = (left: number, right: number) => (right !== 0 ? left / right : 0);
                        break;
                    }
                    default: {
                        throw new ArgumentError(
                            `Cannot apply transformation: got unsupported operator type ${transform.binary.operator}.`,
                        );
                    }
                }

                const leftName = transform.binary.left;
                const rightName = transform.binary.right;
                dataSeries[transform.name] = dataSeries[leftName].map((left, i) => {
                    const right = dataSeries[rightName][i];
                    if (typeof left.value === 'number' && typeof right.value === 'number') {
                        return {
                            value: operator(left.value, right.value),
                            date: left.date,
                        };
                    }
                    return {
                        value: 0,
                        date: left.date,
                    };
                });
                delete dataSeries[leftName];
                delete dataSeries[rightName];
            }
        });
        return dataSeries;
    }
}

export default class AnalyticsReport {
    #id: number;
    #target: AnalyticsReportTarget;
    #createdDate: string;
    #statistics: AnalyticsEntry[];

    constructor(initialData: SerializedAnalyticsReport) {
        this.#id = initialData.job_id || initialData.task_id || initialData.project_id;
        this.#target = initialData.target as AnalyticsReportTarget;
        this.#createdDate = initialData.created_date;
        this.#statistics = [];
        for (const analyticsEntry of initialData.statistics) {
            this.#statistics.push(new AnalyticsEntry(analyticsEntry));
        }
    }

    get id(): number {
        return this.#id;
    }

    get target(): AnalyticsReportTarget {
        return this.#target;
    }

    get createdDate(): string {
        return this.#createdDate;
    }

    get statistics(): AnalyticsEntry[] {
        return this.#statistics;
    }
}
