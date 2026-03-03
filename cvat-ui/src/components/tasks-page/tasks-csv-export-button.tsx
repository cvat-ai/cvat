// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { TasksQuery } from 'reducers';
import { CSVColumn } from 'utils/csv-writer';
import { getCore, Task } from 'cvat-core-wrapper';
import createCSVExportButton from '../export-csv-button-hoc';

const cvat = getCore();

const columns: CSVColumn<Task>[] = [
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
];

const TasksCSVExportButton = createCSVExportButton<Task, TasksQuery>({
    resourceName: 'tasks',
    className: 'cvat-tasks-export-csv-button',
    columns,
    fetchPage: async (query) => {
        const tasks = await cvat.tasks.get(query);
        return {
            results: tasks,
            count: tasks.count,
        };
    },
});

export default TasksCSVExportButton;
