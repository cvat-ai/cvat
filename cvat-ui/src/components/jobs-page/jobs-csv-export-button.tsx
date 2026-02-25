// Copyright (C) 2026 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Button from 'antd/lib/button';
import { DownloadOutlined } from '@ant-design/icons';

import { CombinedState, JobsQuery } from 'reducers';
import IncrementalCSVWriter, { CSVColumn, downloadCSV } from 'utils/csv-writer';
import { exportToCSVAsync } from 'actions/csv-export-actions';
import { getCore, Job } from 'cvat-core-wrapper';

const cvat = getCore();

interface JobsCSVExportButtonProps {
    query?: JobsQuery;
    jobs?: Job[]; // Optional: pre-loaded jobs to export directly
}

function JobsCSVExportButton(props: JobsCSVExportButtonProps): JSX.Element {
    const { query, jobs: predefinedJobs } = props;
    const dispatch = useDispatch();
    const isExporting = useSelector((state: CombinedState) => state.bulkActions.fetching);

    // Define CSV columns for jobs
    const columns: CSVColumn<any>[] = useMemo(() => [
        { header: 'ID', accessor: (job) => job.id },
        { header: 'Task ID', accessor: (job) => job.taskId },
        { header: 'Task Name', accessor: (job) => job.taskName || 'Unknown' },
        { header: 'Project ID', accessor: (job) => job.projectId },
        { header: 'Project Name', accessor: (job) => job.projectName || 'N/A' },
        { header: 'Assignee', accessor: (job) => job.assignee?.username || 'Unassigned' },
        { header: 'Stage', accessor: (job) => job.stage },
        { header: 'State', accessor: (job) => job.state },
        { header: 'Type', accessor: (job) => job.type },
        { header: 'Start Frame', accessor: (job) => job.startFrame },
        { header: 'Stop Frame', accessor: (job) => job.stopFrame },
        { header: 'Frame Count', accessor: (job) => job.stopFrame - job.startFrame + 1 },
        {
            header: 'Created Date',
            accessor: (job) => job.createdDate,
            transform: (date) => new Date(date).toLocaleString(),
        },
        {
            header: 'Updated Date',
            accessor: (job) => job.updatedDate,
            transform: (date) => new Date(date).toLocaleString(),
        },
    ], []);

    const handleExport = useCallback(() => {
        const timestamp = new Date().toISOString().split('T')[0];
        const filename = `cvat-jobs-${timestamp}.csv`;

        // If jobs are pre-loaded, export them directly without API calls
        if (predefinedJobs) {
            const csvWriter = new IncrementalCSVWriter(columns);
            csvWriter.addBatch(predefinedJobs);
            const csvContent = csvWriter.getContent();
            downloadCSV(csvContent, filename);
            return;
        }

        // Otherwise, use the async export action to fetch from API
        dispatch(exportToCSVAsync({
            columns,
            fetchPage: async (page: number, pageSize: number) => {
                const jobs = await cvat.jobs.get({
                    ...query,
                    page,
                    pageSize,
                } as any); // cvat.jobs.get converts pageSize to page_size internally
                return {
                    results: jobs,
                    count: jobs.count,
                };
            },
            filename,
            pageSize: 500,
            resourceName: 'jobs',
        }));
    }, [dispatch, columns, query, predefinedJobs]);

    return (
        <Button
            className='cvat-jobs-export-csv-button'
            type='link'
            size='small'
            icon={<DownloadOutlined />}
            onClick={handleExport}
            disabled={isExporting}
        />
    );
}

export default React.memo(JobsCSVExportButton);
