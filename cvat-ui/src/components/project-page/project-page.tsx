
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
import Button from 'antd/lib/button';
import Title from 'antd/lib/typography/Title';

import { CombinedState } from 'reducers/interfaces';
import { getProjectsAsync, updateProjectsGettingQuery } from 'actions/projects-actions';
import { cancelInferenceAsync } from 'actions/models-actions';
import TaskItem from 'components/tasks-page/task-item';
import DetailsComponent from './details';

interface ParamType {
    id: string;
}

export default function ProjectPageComponent(): JSX.Element {
    // TODO: need to optimize renders here
    const id = +useParams<ParamType>().id;
    const dispatch = useDispatch();
    const history = useHistory();
    const projects = useSelector((state: CombinedState) => state.projects.current);
    const projectsFetching = useSelector((state: CombinedState) => state.projects.fetching);
    const deletes = useSelector((state: CombinedState) => state.projects.activities.deletes);
    const taskDeletes = useSelector((state: CombinedState) => state.tasks.activities.deletes);
    const tasksActiveInferences = useSelector((state: CombinedState) => state.models.inferences);
    const image = 'data:image/png;base64,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';

    const filteredProjects = projects.filter(
        (project) => project.instance.id === id,
    );
    const project = filteredProjects[0];
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
        history.push('/projects');
    }

    if (projectsFetching) {
        return (
            <Spin size='large' className='cvat-spinner' />
        );
    }

    if (!project) {
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
        <Row type='flex' justify='center' align='top' className='cvat-project-page'>
            <Col md={22} lg={18} xl={16} xxl={14}>
                <DetailsComponent project={project} />
                <Row type='flex' justify='space-between' align='middle' className='cvat-project-page-tasks-bar'>
                    <Col>
                        <Title level={4}>Tasks</Title>
                    </Col>
                    <Col>
                        <Button
                            size='large'
                            type='primary'
                            icon='plus'
                            id='cvat-create-task-button'
                            onClick={() => history.push(`/tasks/create?projectId=${id}`)}
                        >
                            Create new task
                        </Button>
                    </Col>
                </Row>
                {project.instance.tasks.map((task: any) => (
                    <TaskItem
                        key={task.id}
                        deleted={task.id in taskDeletes ? taskDeletes[task.id] : false}
                        hidden={false}
                        activeInference={tasksActiveInferences[task.id] || null}
                        cancelAutoAnnotation={() => {
                            dispatch(cancelInferenceAsync(task.id));
                        }}
                        previewImage={image}
                        taskInstance={task}
                    />
                ))}
            </Col>
        </Row>
    );
}
