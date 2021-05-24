// Copyright (C) 2019-2021 Intel Corporation
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
import { PlusOutlined } from '@ant-design/icons';

import { CombinedState, Task } from 'reducers/interfaces';
import { getProjectsAsync } from 'actions/projects-actions';
import { cancelInferenceAsync } from 'actions/models-actions';
import TaskItem from 'components/tasks-page/task-item';
import DetailsComponent from './details';
import ProjectTopBar from './top-bar';

interface ParamType {
    id: string;
}

export default function ProjectPageComponent(): JSX.Element {
    const id = +useParams<ParamType>().id;
    const dispatch = useDispatch();
    const history = useHistory();
    const projects = useSelector((state: CombinedState) => state.projects.current).map((project) => project.instance);
    const projectsFetching = useSelector((state: CombinedState) => state.projects.fetching);
    const deletes = useSelector((state: CombinedState) => state.projects.activities.deletes);
    const taskDeletes = useSelector((state: CombinedState) => state.tasks.activities.deletes);
    const tasksActiveInferences = useSelector((state: CombinedState) => state.models.inferences);
    const tasks = useSelector((state: CombinedState) => state.tasks.current);

    const [project] = projects.filter((_project) => _project.id === id);
    const projectSubsets = [''];
    if (project) projectSubsets.push(...project.subsets);
    const deleteActivity = project && id in deletes ? deletes[id] : null;

    useEffect(() => {
        dispatch(
            getProjectsAsync({
                id,
            }),
        );
    }, [id, dispatch]);

    if (deleteActivity) {
        history.push('/projects');
    }

    if (projectsFetching) {
        return <Spin size='large' className='cvat-spinner' />;
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
        <Row justify='center' align='top' className='cvat-project-page'>
            <Col md={22} lg={18} xl={16} xxl={14}>
                <ProjectTopBar projectInstance={project} />
                <DetailsComponent project={project} />
                <Row justify='space-between' align='middle' className='cvat-project-page-tasks-bar'>
                    <Col>
                        <Title level={3}>Tasks</Title>
                    </Col>
                    <Col>
                        <Button
                            size='large'
                            type='primary'
                            icon={<PlusOutlined />}
                            id='cvat-create-task-button'
                            onClick={() => history.push(`/tasks/create?projectId=${id}`)}
                        >
                            Create new task
                        </Button>
                    </Col>
                </Row>
                {projectSubsets.map((subset: string) => (
                    <React.Fragment key={subset}>
                        {subset && <Title level={4}>{subset}</Title>}
                        {tasks
                            .filter((task) => task.instance.projectId === project.id && task.instance.subset === subset)
                            .map((task: Task) => (
                                <TaskItem
                                    key={task.instance.id}
                                    deleted={task.instance.id in taskDeletes ? taskDeletes[task.instance.id] : false}
                                    hidden={false}
                                    activeInference={tasksActiveInferences[task.instance.id] || null}
                                    cancelAutoAnnotation={() => {
                                        dispatch(cancelInferenceAsync(task.instance.id));
                                    }}
                                    previewImage={task.preview}
                                    taskInstance={task.instance}
                                />
                            ))}
                    </React.Fragment>
                ))}
            </Col>
        </Row>
    );
}
