// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/**
 * Escape CSV value according to RFC 4180
 * - Wrap in quotes if contains comma, quote, or newline
 * - Escape quotes by doubling them
 */
export function escapeCSVValue(value: any): string {
    if (value === null || value === undefined) return '';

    const str = String(value);
    // Escape if contains comma, quote, or newline
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
}

/**
 * Trigger browser download of CSV content
 */
export function downloadCSV(content: string, filename: string): void {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = filename;
    link.style.display = 'none';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
}

/**
 * Column definition for CSV export
 */
export interface CSVColumn<T> {
    header: string;
    accessor: (item: T) => string | number | null | undefined;
    transform?: (value: any) => string;
}

/**
 * Incremental CSV writer for large datasets
 * Builds CSV content in chunks to avoid memory issues
 */
class IncrementalCSVWriter<T> {
    private columns: CSVColumn<T>[];
    private rows: string[] = [];

    constructor(columns: CSVColumn<T>[]) {
        this.columns = columns;
        this.rows.push(this.generateHeader());
    }

    /**
     * Add a batch of items to the CSV
     */
    addBatch(items: T[]): void {
        items.forEach((item) => {
            this.rows.push(this.generateRow(item));
        });
    }

    /**
     * Get the complete CSV content
     */
    getContent(): string {
        return this.rows.join('\n');
    }

    private generateHeader(): string {
        return this.columns
            .map((col) => escapeCSVValue(col.header))
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

/**
 * Simple CSV generator for small datasets (used by cvat-table)
 * Generates complete CSV in one go
 */
export function generateCSV<T>(
    data: T[],
    columns: Array<{ title: string; accessor: (item: T) => any }>,
): string {
    const header = columns.map((col) => escapeCSVValue(col.title)).join(',');

    if (!data || data.length === 0) {
        return header;
    }

    const rows = data.map((item) => columns
        .map((col) => escapeCSVValue(col.accessor(item)))
        .join(','));

    return `${header}\n${rows.join('\n')}`;
}

export default IncrementalCSVWriter;
