// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { ProjectsQuery } from 'reducers';
import { CSVColumn } from 'utils/csv-writer';
import { getCore, Project } from 'cvat-core-wrapper';
import createCSVExportButton from '../export-csv-button-hoc';

const cvat = getCore();

const columns: CSVColumn<Project>[] = [
    { header: 'ID', accessor: (project) => project.id },
    { header: 'Name', accessor: (project) => project.name },
    { header: 'Project URL', accessor: (project) => `${window.location.origin}/projects/${project.id}` },
    { header: 'Owner', accessor: (project) => project.owner?.username || 'Unknown' },
    { header: 'Assignee', accessor: (project) => project.assignee?.username || 'Unassigned' },
    { header: 'Status', accessor: (project) => project.status },
    { header: 'Dimension', accessor: (project) => project.dimension },
    {
        header: 'Task Subsets',
        accessor: (project) => (
            project.subsets && project.subsets.length > 0 ?
                project.subsets.join(', ') :
                'N/A'
        ),
    },
    {
        header: 'Created Date',
        accessor: (project) => project.createdDate,
        transform: (date) => new Date(date).toLocaleString(),
    },
    {
        header: 'Updated Date',
        accessor: (project) => project.updatedDate,
        transform: (date) => new Date(date).toLocaleString(),
    },
    { header: 'Bug Tracker', accessor: (project) => project.bugTracker || 'N/A' },
];

const ProjectsCSVExportButton = createCSVExportButton<Project, ProjectsQuery>({
    resourceName: 'projects',
    className: 'cvat-projects-export-csv-button',
    columns,
    fetchPage: async (query) => {
        const projects = await cvat.projects.get(query);
        return {
            results: projects,
            count: projects.count,
        };
    },
});

export default ProjectsCSVExportButton;
