// Copyright (C) 2026 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Button from 'antd/lib/button';
import { DownloadOutlined } from '@ant-design/icons';

import { CombinedState, TasksQuery } from 'reducers';
import IncrementalCSVWriter, { CSVColumn, downloadCSV } from 'utils/csv-writer';
import { exportToCSVAsync } from 'actions/csv-export-actions';
import { getCore, Task } from 'cvat-core-wrapper';

const cvat = getCore();

interface TasksCSVExportButtonProps {
    query?: TasksQuery;
    tasks?: Task[]; // Optional: pre-loaded tasks to export directly
}

function TasksCSVExportButton(props: TasksCSVExportButtonProps): JSX.Element {
    const { query, tasks: predefinedTasks } = props;
    const dispatch = useDispatch();
    const isExporting = useSelector((state: CombinedState) => state.bulkActions.fetching);

    // Define CSV columns for tasks
    const columns = useMemo<CSVColumn<any>[]>(() => [
        { header: 'ID', accessor: (task) => task.id },
        { header: 'Name', accessor: (task) => task.name },
        { header: 'Project ID', accessor: (task) => task.projectId },
        { header: 'Project Name', accessor: (task) => task.projectName || 'N/A' },
        { header: 'Owner', accessor: (task) => task.owner?.username || 'Unknown' },
        { header: 'Assignee', accessor: (task) => task.assignee?.username || 'Unassigned' },
        { header: 'Status', accessor: (task) => task.status },
        { header: 'Mode', accessor: (task) => task.mode },
        { header: 'Size', accessor: (task) => task.size },
        { header: 'Subset', accessor: (task) => task.subset || 'N/A' },
        {
            header: 'Created Date',
            accessor: (task) => task.createdDate,
            transform: (date) => new Date(date).toLocaleString(),
        },
        {
            header: 'Updated Date',
            accessor: (task) => task.updatedDate,
            transform: (date) => new Date(date).toLocaleString(),
        },
        { header: 'Bug Tracker', accessor: (task) => task.bugTracker || 'N/A' },
    ], []);

    const handleExport = useCallback(() => {
        const timestamp = new Date().toISOString().split('T')[0];
        const filename = `cvat-tasks-${timestamp}.csv`;

        // If tasks are pre-loaded, export them directly without API calls
        if (predefinedTasks) {
            const csvWriter = new IncrementalCSVWriter(columns);
            csvWriter.addBatch(predefinedTasks);
            const csvContent = csvWriter.getContent();
            downloadCSV(csvContent, filename);
            return;
        }

        // Otherwise, use the async export action to fetch from API
        dispatch(exportToCSVAsync({
            columns,
            fetchPage: async (page: number, pageSize: number) => {
                const tasks = await cvat.tasks.get({
                    ...query,
                    page,
                    pageSize,
                } as any); // cvat.tasks.get converts pageSize to page_size internally
                return {
                    results: tasks,
                    count: tasks.count,
                };
            },
            filename,
            pageSize: 500,
            resourceName: 'tasks',
        }));
    }, [dispatch, columns, query, predefinedTasks]);

    return (
        <Button
            className='cvat-tasks-export-csv-button'
            type='link'
            size='small'
            icon={<DownloadOutlined />}
            onClick={handleExport}
            disabled={isExporting}
        />
    );
}

export default React.memo(TasksCSVExportButton);
