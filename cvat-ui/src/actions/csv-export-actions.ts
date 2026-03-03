// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import notification from 'antd/lib/notification';

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
}

export function exportToCSVAsync<T>(options: CSVExportOptions<T>) {
    return async (dispatch: ThunkDispatch, getState: () => CombinedState) => {
        const {
            columns,
            fetchPage,
            filename,
            pageSize = 100,
            resourceName = 'items',
        } = options;

        try {
            dispatch(bulkActions.startBulkAction());

            const csvWriter = new IncrementalCSVWriter<T>(columns);

            // Fetch first page to get total count
            const firstPage = await fetchPage(1, pageSize);
            const totalCount = firstPage.count;
            const totalPages = Math.ceil(totalCount / pageSize);

            if (getState().bulkActions.cancelled) {
                return;
            }

            if (totalCount === 0) {
                const csvContent = csvWriter.getContent();
                downloadCSV(csvContent, filename);

                notification.info({
                    message: 'Export completed',
                    description: `Exported ${filename} with no data (headers only).`,
                });
                return;
            }

            csvWriter.addBatch(firstPage.results);

            dispatch(bulkActions.updateBulkActionStatus({
                message: `Exporting ${resourceName}: ${firstPage.results.length} of ${totalCount}`,
                percent: Math.round((1 / totalPages) * 100),
            }));

            for (let page = 2; page <= totalPages; page++) {
                if (getState().bulkActions.cancelled) {
                    return;
                }

                const response = await fetchPage(page, pageSize);
                csvWriter.addBatch(response.results);

                const loadedCount = (page - 1) * pageSize + response.results.length;
                dispatch(bulkActions.updateBulkActionStatus({
                    message: `Exporting ${resourceName}: ${loadedCount} of ${totalCount}`,
                    percent: Math.round((page / totalPages) * 100),
                }));
            }

            const csvContent = csvWriter.getContent();
            downloadCSV(csvContent, filename);

            notification.success({
                message: 'Export completed',
                description: `Successfully exported ${totalCount} ${resourceName} to ${filename}`,
            });
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

            notification.error({
                message: 'Export failed',
                description: error instanceof Error ? error.message : 'An error occurred during export',
            });
        } finally {
            dispatch(bulkActions.finishBulkAction());
        }
    };
}
