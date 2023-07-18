// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { ArgumentError } from './exceptions';

export interface SerializedDataEntry {
    date?: string;
    value?: number | Record<string, number>
}

export interface SerializedTransformBinaryOp {
    left: string;
    operator: string;
    right: string;
}

export interface SerializedTransformationEntry {
    name: string;
    binary?: SerializedTransformBinaryOp;
}

export interface SerializedAnalyticsEntry {
    title?: string;
    description?: string;
    granularity?: string;
    default_view?: string;
    dataseries?: Record<string, SerializedDataEntry[]>;
    transformations?: SerializedTransformationEntry[];
}

export interface SerializedAnalyticsReport {
    id?: number;
    target?: string;
    created_date?: string;
    statistics?: Record<string, SerializedAnalyticsEntry>
}

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
    #title: string;
    #description: string;
    #granularity: string;
    #defaultView: AnalyticsEntryViewType;
    #dataseries: Record<string, SerializedDataEntry[]>;
    #transformations: SerializedTransformationEntry[];

    constructor(initialData: SerializedAnalyticsEntry) {
        this.#title = initialData.title;
        this.#description = initialData.description;
        this.#granularity = initialData.granularity;
        this.#defaultView = initialData.default_view as AnalyticsEntryViewType;
        this.#transformations = initialData.transformations;
        this.#dataseries = this.applyTransformations(initialData.dataseries);
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

    get dataseries(): Record<string, SerializedDataEntry[]> {
        return this.#dataseries;
    }

    get transformations(): SerializedTransformationEntry[] {
        return this.#transformations;
    }

    private applyTransformations(
        dataseries: Record<string, SerializedDataEntry[]>,
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
                dataseries[transform.name] = dataseries[leftName].map((left, i) => {
                    const right = dataseries[rightName][i];
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
                delete dataseries[leftName];
                delete dataseries[rightName];
            }
        });
        return dataseries;
    }
}

export default class AnalyticsReport {
    #id: number;
    #target: AnalyticsReportTarget;
    #createdDate: string;
    #statistics: Record<string, AnalyticsEntry>;

    constructor(initialData: SerializedAnalyticsReport) {
        this.#id = initialData.id;
        this.#target = initialData.target as AnalyticsReportTarget;
        this.#createdDate = initialData.created_date;
        this.#statistics = {};
        for (const [key, analyticsEntry] of Object.entries(initialData.statistics)) {
            this.#statistics[key] = new AnalyticsEntry(analyticsEntry);
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

    get statistics(): Record<string, AnalyticsEntry> {
        return this.#statistics;
    }
}
