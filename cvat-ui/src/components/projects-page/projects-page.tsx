// Copyright (C) 2020-2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation, useHistory } from 'react-router';
import Spin from 'antd/lib/spin';

import { CombinedState, ProjectsQuery } from 'reducers/interfaces';
import { getProjectsAsync } from 'actions/projects-actions';
import FeedbackComponent from 'components/feedback/feedback';
import ImportDatasetModal from 'components/import-dataset-modal/import-dataset-modal';
import EmptyListComponent from './empty-list';
import TopBarComponent from './top-bar';
import ProjectListComponent from './project-list';

export default function ProjectsPageComponent(): JSX.Element {
    const { search } = useLocation();
    const history = useHistory();
    const dispatch = useDispatch();
    const projectFetching = useSelector((state: CombinedState) => state.projects.fetching);
    const projectsCount = useSelector((state: CombinedState) => state.projects.current.length);
    const gettingQuery = useSelector((state: CombinedState) => state.projects.gettingQuery);

    const anySearchQuery = !!Array.from(new URLSearchParams(search).keys()).filter((value) => value !== 'page').length;

    useEffect(() => {
        const searchParams: Partial<ProjectsQuery> = {};
        for (const [param, value] of new URLSearchParams(search)) {
            searchParams[param] = ['page', 'id'].includes(param) ? Number.parseInt(value, 10) : value;
        }
        dispatch(getProjectsAsync(searchParams));
    }, []);

    useEffect(() => {
        const searchParams = new URLSearchParams();
        for (const [name, value] of Object.entries(gettingQuery)) {
            if (value !== null && typeof value !== 'undefined') {
                searchParams.append(name, value.toString());
            }
        }
        history.push({
            pathname: '/projects',
            search: `?${searchParams.toString()}`,
        });
    }, [gettingQuery]);

    if (projectFetching) {
        return <Spin size='large' className='cvat-spinner' />;
    }

    return (
        <div className='cvat-projects-page'>
            <TopBarComponent />
            {projectsCount ? <ProjectListComponent /> : <EmptyListComponent notFound={anySearchQuery} />}
            <FeedbackComponent />
            <ImportDatasetModal />
        </div>
    );
}
