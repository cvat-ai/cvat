// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

export function escapeCSVValue(value: any): string {
    if (value === null || value === undefined) return '';

    if (typeof value !== 'string') {
        return String(value);
    }

    const escapedStr = value.replace(/"/g, '""');
    return `"${escapedStr}"`;
}

export function downloadCSV(content: string, filename: string): void {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = filename;
    link.style.display = 'none';

    document.body.appendChild(link);
    link.click();

    setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }, 0);
}

export interface CSVColumn<T> {
    header: string;
    accessor: (item: T) => string | number | null | undefined;
    transform?: (value: any) => string;
}

class IncrementalCSVWriter<T> {
    private columns: CSVColumn<T>[];
    private rows: string[] = [];
    private uniqueKey: keyof T | null;
    private seenKeys: Set<string | number> = new Set();

    constructor(columns: CSVColumn<T>[], uniqueKey: keyof T | null = null) {
        this.columns = columns;
        this.uniqueKey = uniqueKey;
        this.rows.push(this.generateHeader());
    }

    addBatch(items: T[]): void {
        items.forEach((item) => {
            if (this.uniqueKey !== null) {
                const keyValue = item[this.uniqueKey];
                if (keyValue !== null && keyValue !== undefined) {
                    const keyStr = String(keyValue);
                    if (this.seenKeys.has(keyStr)) {
                        return;
                    }
                    this.seenKeys.add(keyStr);
                }
            }

            this.rows.push(this.generateRow(item));
        });
    }

    getContent(): string {
        return this.rows.join('\n');
    }

    private generateHeader(): string {
        return this.columns
            .map((col) => col.header)
            .join(',');
    }

    private generateRow(item: T): string {
        return this.columns
            .map((col) => {
                const value = col.accessor(item);
                const transformed = col.transform ? col.transform(value) : value;
                return escapeCSVValue(transformed);
            })
            .join(',');
    }
}

export function generateCSV<T>(
    data: T[],
    columns: Array<{ title: string; accessor: (item: T) => any }>,
): string {
    const header = columns.map((col) => col.title).join(',');

    if (!data || data.length === 0) {
        return header;
    }

    const rows = data.map((item) => columns
        .map((col) => escapeCSVValue(col.accessor(item)))
        .join(','));

    return `${header}\n${rows.join('\n')}`;
}

export default IncrementalCSVWriter;
