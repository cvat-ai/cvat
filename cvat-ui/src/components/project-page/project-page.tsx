
// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useHistory, useParams } from 'react-router';
import Spin from 'antd/lib/spin';
import { Row, Col } from 'antd/lib/grid';
import Result from 'antd/lib/result';

import { CombinedState } from 'reducers/interfaces';
import { getProjectsAsync, updateProjectsGettingQuery } from 'actions/projects-actions';
import DetailsComponent from './details';

interface ParamType {
    id: string;
}

export default function TaskPageComponent(): JSX.Element {
    // TODO: need to optimize renders here
    const id = +useParams<ParamType>().id;
    const dispatch = useDispatch();
    const history = useHistory();
    const gettingQueryId = useSelector((state: CombinedState) => state.projects.gettingQuery.id);
    const projects = useSelector((state: CombinedState) => state.projects.current);
    const deletes = useSelector((state: CombinedState) => state.projects.activities.deletes);

    const filteredProjects = projects.filter(
        (project) => project.instance.id === id,
    );
    const project = filteredProjects[0] || (gettingQueryId === id || Number.isNaN(id)
        ? undefined : null);
    const deleteActivity = project && id in deletes ? deletes[id] : null;

    useEffect(() => {
        dispatch(updateProjectsGettingQuery({
            id,
            page: 1,
            search: null,
            owner: null,
            name: null,
            status: null,
        }));
        dispatch(getProjectsAsync());
    }, [id, dispatch]);

    if (deleteActivity) {
        history.push('projects');
    }

    if (project === null) {
        return (
            <Spin size='large' className='cvat-spinner' />
        );
    }

    if (typeof (project) === 'undefined') {
        return (
            <Result
                className='cvat-not-found'
                status='404'
                title='Sorry, but this project was not found'
                subTitle='Please, be sure information you tried to get exist and you have access'
            />
        );
    }

    return (
        <Row type='flex' justify='center' align='top' className='cvat-task-details-wrapper'>
            <Col md={22} lg={18} xl={16} xxl={14}>
                <DetailsComponent project={project} />
                {/* <TasksListContainer project={project} /> */}
            </Col>
        </Row>
    );
}
