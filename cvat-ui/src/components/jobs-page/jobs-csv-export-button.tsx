// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { JobsQuery } from 'reducers';
import { CSVColumn } from 'utils/csv-writer';
import { getCore, Job } from 'cvat-core-wrapper';
import createCSVExportButton from '../export-csv-button-hoc';

const cvat = getCore();

const columns: CSVColumn<Job>[] = [
    { header: 'ID', accessor: (job) => job.id },
    { header: 'Job URL', accessor: (job) => `${window.location.origin}/tasks/${job.taskId}/jobs/${job.id}` },
    { header: 'Task ID', accessor: (job) => job.taskId },
    { header: 'Task Name', accessor: (job) => job.taskName || 'Unknown' },
    { header: 'Task URL', accessor: (job) => `${window.location.origin}/tasks/${job.taskId}` },
    { header: 'Project ID', accessor: (job) => job.projectId },
    { header: 'Project Name', accessor: (job) => job.projectName || 'N/A' },
    { header: 'Project URL', accessor: (job) => (job.projectId ? `${window.location.origin}/projects/${job.projectId}` : 'N/A') },
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
];

const JobsCSVExportButton = createCSVExportButton<Job, JobsQuery>({
    resourceName: 'jobs',
    className: 'cvat-jobs-export-csv-button',
    columns,
    fetchPage: async (query) => {
        const jobs = await cvat.jobs.get(query);
        return {
            results: jobs,
            count: jobs.count,
        };
    },
});

export default JobsCSVExportButton;
