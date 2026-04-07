// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { CombinedState } from 'reducers';
import { ThunkDispatch } from 'utils/redux';
import IncrementalCSVWriter, { CSVColumn, downloadCSV } from 'utils/csv-writer';
import { bulkActions } from './bulk-actions';

export interface CSVExportOptions<T> {
    columns: CSVColumn<T>[];
    fetchPage: (page: number, pageSize: number) => Promise<{ results: T[]; count: number }>;
    filename: string;
    pageSize?: number;
    resourceName?: string;
    uniqueKey?: keyof T | null;
    onSuccess?: (totalCount: number, filename: string) => void;
    onError?: (error: Error) => void;
}

export function exportToCSVAsync<T>(options: CSVExportOptions<T>) {
    return async (dispatch: ThunkDispatch, getState: () => CombinedState) => {
        const {
            columns,
            fetchPage,
            filename,
            pageSize = 100,
            resourceName = 'items',
            uniqueKey = null,
            onSuccess,
            onError,
        } = options;

        try {
            dispatch(bulkActions.startBulkAction());

            const csvWriter = new IncrementalCSVWriter<T>(columns, uniqueKey);

            let totalCount = 0;
            let totalPages: number | null = null;

            for (let page = 1; page <= (totalPages ?? 1); page++) {
                if (getState().bulkActions.cancelled) {
                    return;
                }

                const response = await fetchPage(page, pageSize);

                totalCount = response.count;
                totalPages = Math.ceil(totalCount / pageSize);

                if (page === 1 && totalCount === 0) {
                    const csvContent = csvWriter.getContent();
                    downloadCSV(csvContent, filename);

                    if (onSuccess) {
                        onSuccess(totalCount, filename);
                    }
                    return;
                }

                csvWriter.addBatch(response.results);

                const loadedCount = (page - 1) * pageSize + response.results.length;
                dispatch(bulkActions.updateBulkActionStatus({
                    message: `Exporting ${resourceName}: ${loadedCount} of ${totalCount}`,
                    percent: Math.round((page / totalPages) * 100),
                }));
            }

            const csvContent = csvWriter.getContent();
            downloadCSV(csvContent, filename);

            if (onSuccess) {
                onSuccess(totalCount, filename);
            }
        } catch (error) {
            dispatch(bulkActions.bulkOperationFailed({
                error,
                remainingItemsCount: 0,
                retryPayload: {
                    items: [],
                    operation: async () => {},
                    statusMessage: () => '',
                },
            }));

            if (onError && error instanceof Error) {
                onError(error);
            }
        } finally {
            dispatch(bulkActions.finishBulkAction());
        }
    };
}
