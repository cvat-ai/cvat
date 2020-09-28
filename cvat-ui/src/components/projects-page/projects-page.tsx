// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation } from 'react-router';
import Spin from 'antd/lib/spin';

import FeedbackComponent from 'components/feedback/feedback';
import { CombinedState, ProjectsQuery } from 'reducers/interfaces';
import { getProjectsAsync, updateProjectsGettingQuery } from 'actions/projects-actions';
import EmptyListComponent from './empty-list';
import TopBarComponent from './top-bar';
import ProjectListComponent from './project-list';

export default function ProjectsPageComponent(): JSX.Element {
    const { search } = useLocation();

    const dispatch = useDispatch();
    const projectFetching = useSelector((state: CombinedState) => state.projects.fetching);
    const projectsCount = useSelector((state: CombinedState) => state.projects.current.length);

    const anySearchQuery = !!Array.from(new URLSearchParams(search).keys()).filter((value) => value !== 'page').length;

    useEffect(() => {
        const searchParams: Partial<ProjectsQuery> = {};
        for (const [param, value] of new URLSearchParams(search)) {
            searchParams[param] = ['page', 'id'].includes(param) ? Number.parseInt(value, 10) : value;
        }
        dispatch(updateProjectsGettingQuery(searchParams));
        dispatch(getProjectsAsync());
    }, [search]);

    if (projectFetching) {
        return (
            <Spin size='large' className='cvat-spinner' />
        );
    }

    return (
        <div className='cvat-projects-page'>
            <TopBarComponent />
            { projectsCount
                ? (
                    <ProjectListComponent />
                ) : (
                    <EmptyListComponent notFound={anySearchQuery} />
                )}
            <FeedbackComponent />
        </div>
    );
}
