// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Button from 'antd/lib/button';
import { DownloadOutlined } from '@ant-design/icons';
import notification from 'antd/lib/notification';

import { CombinedState } from 'reducers';
import IncrementalCSVWriter, { CSVColumn, downloadCSV } from 'utils/csv-writer';
import { exportToCSVAsync } from 'actions/csv-export-actions';
import { filterNull, NonNullableProperties } from 'utils/filter-null';

interface CSVExportButtonConfig<T, Q> {
    resourceName: string;
    className: string;
    columns: CSVColumn<T>[];
    fetchPage: (
        query: NonNullableProperties<Q>,
        page: number,
        pageSize: number
    ) => Promise<{ results: T[]; count: number }>;
}

interface CSVExportButtonProps<T, Q> {
    query?: Q;
    predefinedData?: T[];
}

function createCSVExportButton<T, Q>(
    config: CSVExportButtonConfig<T, Q>,
): React.MemoExoticComponent<(props: CSVExportButtonProps<T, Q>) => JSX.Element> {
    function CSVExportButton(props: CSVExportButtonProps<T, Q>): JSX.Element {
        const { query, predefinedData } = props;
        const dispatch = useDispatch();
        const isExporting = useSelector((state: CombinedState) => state.bulkActions.fetching);

        const columns = useMemo(() => config.columns, []);

        const handleExport = useCallback(() => {
            const timestamp = new Date().toISOString().split('T')[0];
            const filename = `cvat-${config.resourceName}-${timestamp}.csv`;

            if (predefinedData) {
                const csvWriter = new IncrementalCSVWriter(columns);
                csvWriter.addBatch(predefinedData);
                const csvContent = csvWriter.getContent();
                downloadCSV(csvContent, filename);
                return;
            }

            dispatch(exportToCSVAsync({
                columns,
                fetchPage: async (page: number, pageSize: number) => {
                    const filteredQuery = filterNull({
                        ...query,
                        page,
                        pageSize,
                    }) as NonNullableProperties<Q>;
                    return config.fetchPage(filteredQuery, page, pageSize);
                },
                filename,
                pageSize: 100,
                resourceName: config.resourceName,
                onSuccess: (totalCount: number, exportedFilename: string) => {
                    notification.success({
                        message: 'Export completed',
                        description: (
                            `Successfully exported ${totalCount} ${config.resourceName} to ${exportedFilename}`
                        ),
                    });
                },
                onError: (error: Error) => {
                    notification.error({
                        message: 'CSV export failed',
                        description: error.message || 'An unknown error occurred during export',
                    });
                },
            }));
        }, [dispatch, columns, query, predefinedData]);

        return (
            <Button
                className={config.className}
                type='link'
                size='small'
                icon={<DownloadOutlined />}
                onClick={handleExport}
                disabled={isExporting}
            />
        );
    }

    return React.memo(CSVExportButton);
}

export default createCSVExportButton;
