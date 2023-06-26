// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

export interface SerializedDataEntry {
    datetime?: string;
    value?: number | Record<string, number>
}

export interface SerializedAnalyticsEntry {
    title?: string;
    description?: string;
    granularity?: string;
    default_view?: string;
    dataseries?: Record<string, SerializedAnalyticsEntry[]>;
}

export interface SerializedAnalyticsReport {
    id?: number;
    type?: string;
    created_date?: string;
    statistics?: Record<string, SerializedAnalyticsEntry>
}

export enum AnalyticsReportType {
    JOB = 'job',
    TASK = 'task',
    PROJECT = 'project',
}

export enum AnalyticsEntryView {
    HISTOGRAM = 'histogram',
    NUMERIC = 'numeric',
}

export class AnalyticsEntry {
    #title: string;
    #description: string;
    #granularity: string;
    #defaultView: AnalyticsEntryView;
    #dataseries: Record<string, SerializedAnalyticsEntry[]>;

    constructor(initialData: SerializedAnalyticsEntry) {
        this.#title = initialData.title;
        this.#description = initialData.description;
        this.#granularity = initialData.granularity;
        this.#defaultView = initialData.default_view as AnalyticsEntryView;
        this.#dataseries = initialData.dataseries;
    }
}

export default class AnalyticsReport {
    #id: number;
    #type: AnalyticsReportType;
    #createdDate: string;
    #statistics: Record<string, AnalyticsEntry>;

    constructor(initialData: SerializedAnalyticsReport) {
        this.#id = initialData.id;
        this.#type = initialData.type as AnalyticsReportType;
        this.#createdDate = initialData.created_date;

        this.#statistics = {};
        for (const [key, analyticsEntry] of Object.entries(initialData.statistics)) {
            this.#statistics[key] = new AnalyticsEntry(analyticsEntry);
        }
    }

    get id(): number {
        return this.#id;
    }

    get type(): AnalyticsReportType {
        return this.#type;
    }

    get createdDate(): string {
        return this.#createdDate;
    }

    get statistics(): Record<string, AnalyticsEntry> {
        return this.#statistics;
    }
}
