// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Button from 'antd/lib/button';
import { DownloadOutlined } from '@ant-design/icons';

import { CombinedState, ProjectsQuery } from 'reducers';
import { CSVColumn } from 'utils/csv-writer';
import { exportToCSVAsync } from 'actions/csv-export-actions';
import { filterNull } from 'utils/filter-null';
import { getCore } from 'cvat-core-wrapper';

const cvat = getCore();

interface ProjectsCSVExportButtonProps {
    query: ProjectsQuery;
}

function ProjectsCSVExportButton(props: ProjectsCSVExportButtonProps): JSX.Element {
    const { query } = props;
    const dispatch = useDispatch();
    const isExporting = useSelector((state: CombinedState) => state.bulkActions.fetching);

    const columns = useMemo<CSVColumn<any>[]>(() => [
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
    ], []);

    const handleExport = useCallback(() => {
        const timestamp = new Date().toISOString().split('T')[0];
        const filename = `cvat-projects-${timestamp}.csv`;

        dispatch(exportToCSVAsync({
            columns,
            fetchPage: async (page: number, pageSize: number) => {
                const filteredQuery = filterNull({
                    ...query,
                    page,
                    pageSize,
                });
                const projects = await cvat.projects.get(filteredQuery);
                return {
                    results: projects,
                    count: projects.count,
                };
            },
            filename,
            pageSize: 100,
            resourceName: 'projects',
        }));
    }, [dispatch, columns, query]);

    return (
        <Button
            className='cvat-projects-export-csv-button'
            type='link'
            size='small'
            icon={<DownloadOutlined />}
            onClick={handleExport}
            disabled={isExporting}
        />
    );
}

export default React.memo(ProjectsCSVExportButton);
