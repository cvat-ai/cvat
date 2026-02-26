// Copyright (C) 2026 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Button from 'antd/lib/button';
import { DownloadOutlined } from '@ant-design/icons';

import { CombinedState, TasksQuery } from 'reducers';
import { CSVColumn } from 'utils/csv-writer';
import { exportToCSVAsync } from 'actions/csv-export-actions';
import { filterNull } from 'utils/filter-null';
import { getCore } from 'cvat-core-wrapper';

const cvat = getCore();

interface TasksCSVExportButtonProps {
    query: TasksQuery;
}

function TasksCSVExportButton(props: TasksCSVExportButtonProps): JSX.Element {
    const { query } = props;
    const dispatch = useDispatch();
    const isExporting = useSelector((state: CombinedState) => state.bulkActions.fetching);

    const columns = useMemo<CSVColumn<any>[]>(() => [
        { header: 'ID', accessor: (task) => task.id },
        { header: 'Name', accessor: (task) => task.name },
        { header: 'Task URL', accessor: (task) => `${window.location.origin}/tasks/${task.id}` },
        { header: 'Project ID', accessor: (task) => task.projectId },
        { header: 'Project Name', accessor: (task) => task.projectName || 'N/A' },
        { header: 'Project URL', accessor: (task) => (task.projectId ? `${window.location.origin}/projects/${task.projectId}` : 'N/A') },
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

        dispatch(exportToCSVAsync({
            columns,
            fetchPage: async (page: number, pageSize: number) => {
                const filteredQuery = filterNull({
                    ...query,
                    page,
                    pageSize,
                });
                const tasks = await cvat.tasks.get(filteredQuery);
                return {
                    results: tasks,
                    count: tasks.count,
                };
            },
            filename,
            pageSize: 100,
            resourceName: 'tasks',
        }));
    }, [dispatch, columns, query]);

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
