// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React, { useCallback, useEffect, useState } from 'react';
import { useHistory } from 'react-router';
import { useDispatch, useSelector, shallowEqual } from 'react-redux';
import Spin from 'antd/lib/spin';
import { CombinedState, ProjectsQuery, SelectedResourceType } from 'reducers';
import { getProjectsAsync } from 'actions/projects-actions';
import { updateHistoryFromQuery } from 'components/resource-sorting-filtering';
import { anySearch } from 'utils/any-search';
import { useResourceQuery } from 'utils/hooks';
import { selectionActions } from 'actions/selection-actions';
import EmptyListComponent from './empty-list';
import TopBarComponent from './top-bar';
import ProjectListComponent from './project-list';

export default function ProjectsPageComponent(): JSX.Element {
    const dispatch = useDispatch();
    const history = useHistory();
    const {
        fetching,
        count,
        query,
        tasksQuery,
        importing,
        bulkFetching,
        currentProjects,
        deletedProjects,
        selectedCount,
    } = useSelector((state: CombinedState) => ({
        fetching: state.projects.fetching,
        count: state.projects.current.length,
        query: state.projects.gettingQuery,
        tasksQuery: state.projects.tasksGettingQuery,
        importing: state.import.projects.backup.importing,
        bulkFetching: state.bulkActions.fetching,
        currentProjects: state.projects.current,
        deletedProjects: state.projects.activities.deletes,
        selectedCount: state.projects.selected.length,
    }), shallowEqual);
    const [isMounted, setIsMounted] = useState(false);
    const isAnySearch = anySearch<ProjectsQuery>(query);

    const selectableProjectIds = currentProjects
        .map((p) => p.id).filter((id) => !deletedProjects[id]);
    const onSelectAll = useCallback(() => {
        dispatch(selectionActions.selectResources(selectableProjectIds, SelectedResourceType.PROJECTS));
    }, [selectableProjectIds]);

    const updatedQuery = useResourceQuery<ProjectsQuery>(query, { pageSize: 12 });

    useEffect(() => {
        dispatch(getProjectsAsync({ ...updatedQuery }));
        setIsMounted(true);
    }, []);

    useEffect(() => {
        if (isMounted) {
            history.replace({
                search: updateHistoryFromQuery(query),
            });
        }
    }, [query]);

    const content = count ? <ProjectListComponent /> : <EmptyListComponent notFound={isAnySearch} />;

    return (
        <div className='cvat-projects-page'>
            <TopBarComponent
                onApplySearch={(search: string | null) => {
                    dispatch(
                        getProjectsAsync({
                            ...query,
                            search,
                            page: 1,
                        }, { ...tasksQuery, page: 1 }),
                    );
                }}
                onApplyFilter={(filter: string | null) => {
                    dispatch(
                        getProjectsAsync({
                            ...query,
                            filter,
                            page: 1,
                        }, { ...tasksQuery, page: 1 }),
                    );
                }}
                onApplySorting={(sorting: string | null) => {
                    dispatch(
                        getProjectsAsync({
                            ...query,
                            sort: sorting,
                            page: 1,
                        }, { ...tasksQuery, page: 1 }),
                    );
                }}
                query={updatedQuery}
                importing={importing}
                selectedCount={selectedCount}
                onSelectAll={onSelectAll}
            />
            { fetching && !bulkFetching ? (
                <div className='cvat-empty-project-list'>
                    <Spin size='large' className='cvat-spinner' />
                </div>
            ) : content }
        </div>
    );
}
