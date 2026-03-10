// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Button from 'antd/lib/button';
import Tooltip from 'antd/lib/tooltip';
import { DownloadOutlined } from '@ant-design/icons';
import notification from 'antd/lib/notification';

import { CombinedState } from 'reducers';
import IncrementalCSVWriter, { CSVColumn, downloadCSV } from 'utils/csv-writer';
import { exportToCSVAsync } from 'actions/csv-export-actions';
import { filterNull, NonNullableProperties } from 'utils/filter-null';

interface CSVExportButtonConfig<T, Q> {
    resourceName: string;
    className: string;
    tooltipTitle: string;
    columns: CSVColumn<T>[];
    uniqueKey?: keyof T | null;
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
                const csvWriter = new IncrementalCSVWriter(columns, config.uniqueKey ?? null);
                csvWriter.addBatch(predefinedData);
                const csvContent = csvWriter.getContent();
                downloadCSV(csvContent, filename);
                return;
            }

            dispatch(exportToCSVAsync({
                columns,
                uniqueKey: config.uniqueKey ?? null,
                fetchPage: async (page: number, pageSize: number) => {
                    const baseQuery = {
                        ...query,
                        page,
                        pageSize,
                    };

                    // Add default sort by ID descending if no sort is specified
                    if (!('sort' in baseQuery && baseQuery.sort)) {
                        (baseQuery as any).sort = '-id';
                    }

                    const filteredQuery = filterNull(baseQuery) as NonNullableProperties<Q>;
                    return config.fetchPage(filteredQuery, page, pageSize);
                },
                filename,
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
            <Tooltip title={config.tooltipTitle}>
                <Button
                    className={config.className}
                    type='link'
                    size='small'
                    icon={<DownloadOutlined />}
                    onClick={handleExport}
                    disabled={isExporting}
                />
            </Tooltip>
        );
    }

    return React.memo(CSVExportButton);
}

export default createCSVExportButton;
