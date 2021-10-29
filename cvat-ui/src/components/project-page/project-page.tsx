// Copyright (C) 2019-2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React, { useEffect, useState } from 'react';
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
import MoveTaskModal from 'components/move-task-modal/move-task-modal';
import ModelRunnerDialog from 'components/model-runner-modal/model-runner-dialog';
import DetailsComponent from './details';
import ProjectTopBar from './top-bar';
import Pagination from 'antd/lib/pagination';
import { message } from 'antd';

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
    // const tasks = useSelector((state: CombinedState) => state.tasks.current);

    const [project] = projects.filter((_project) => _project.id === id);
    const projectSubsets = [''];
    if (project) projectSubsets.push(...project.subsets);
    const deleteActivity = project && id in deletes ? deletes[id] : null;

    const [tasksLoading, setTasksLoading] = useState(true);
    const [tasks, setTasks] = useState([]);
    const [taskCount, setTaskCount] = useState(0);
    const [page, setPage] = useState(1);

    const fetchTasks = (page: number) => {
        setTasksLoading(true);
        setPage(page);
        fetch(`/api/v1/tasks?page_size=10&page=${page}&project_id=${id}`)
            .then((response: any) => response.json())
            .then((data: any) => {
                setTasks(data.results);
                setTaskCount(data.count);
            })
            .catch((error: any) => {
                console.error(error);
                message.error(error);
            })
            .finally(() => {
                setTasksLoading(false);
            });
    }

    useEffect(() => {
        if (id) {
            fetchTasks(page);
        }
    }, [id]);

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
                {tasksLoading ? (
                    <Spin size='large' className='cvat-spinner' />
                ) : (
                    <div style={{ paddingBottom: 50 }}>
                        {tasks
                            .map((task: any) => {
                                // Hack to generate missing properties for our hacked API response
                                task.jobs = task.segments.reduce((jobs: any[], segment: any) => {
                                    return [...jobs, ...segment.jobs];
                                }, []);
                                task.updatedDate = task.updated_date;
                                return task;
                            })
                            .map((task: any) => (
                                <TaskItem
                                    key={task.id}
                                    deleted={task.id in taskDeletes ? taskDeletes[task.id] : false}
                                    hidden={false}
                                    activeInference={tasksActiveInferences[task.id] || null}
                                    cancelAutoAnnotation={() => {
                                        dispatch(cancelInferenceAsync(task.id));
                                    }}
                                    previewImage={task.preview}
                                    taskInstance={task}
                                />
                            ))
                        }
                        <Row justify='center' align='middle'>
                            <Col md={22} lg={18} xl={16} xxl={14}>
                                <Pagination
                                    className='cvat-tasks-pagination'
                                    onChange={fetchTasks}
                                    showSizeChanger={false}
                                    total={taskCount}
                                    pageSize={10}
                                    current={page}
                                    showQuickJumper
                                />
                            </Col>
                        </Row>
                    </div>
                )}
            </Col>
            <MoveTaskModal />
            <ModelRunnerDialog />
        </Row>
    );
}
