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
    { header: 'Owner', accessor: (project) => project.owner?.username ?? '' },
    { header: 'Assignee', accessor: (project) => project.assignee?.username ?? '' },
    { header: 'Status', accessor: (project) => project.status },
    { header: 'Dimension', accessor: (project) => project.dimension },
    {
        header: 'Task Subsets',
        accessor: (project) => (
            project.subsets && project.subsets.length > 0 ?
                project.subsets.join(', ') :
                ''
        ),
    },
    {
        header: 'Created Date',
        accessor: (project) => project.createdDate,
    },
    {
        header: 'Updated Date',
        accessor: (project) => project.updatedDate,
    },
    { header: 'Bug Tracker', accessor: (project) => project.bugTracker ?? '' },
];

const ProjectsCSVExportButton = createCSVExportButton<Project, ProjectsQuery>({
    resourceName: 'projects',
    className: 'cvat-projects-export-csv-button',
    tooltipTitle: 'Export projects to CSV',
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
