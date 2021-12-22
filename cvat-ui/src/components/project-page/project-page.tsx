// Copyright (C) 2019-2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React, { useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useHistory, useParams, useLocation } from 'react-router';
import Spin from 'antd/lib/spin';
import { Row, Col } from 'antd/lib/grid';
import Result from 'antd/lib/result';
import Button from 'antd/lib/button';
import Title from 'antd/lib/typography/Title';
import Pagination from 'antd/lib/pagination';
import { PlusOutlined } from '@ant-design/icons';

import { CombinedState, Task, TasksQuery } from 'reducers/interfaces';
import { getProjectsAsync, getProjectTasksAsync } from 'actions/projects-actions';
import { cancelInferenceAsync } from 'actions/models-actions';
import TaskItem from 'components/tasks-page/task-item';
import SearchField from 'components/search-field/search-field';
import MoveTaskModal from 'components/move-task-modal/move-task-modal';
import ModelRunnerDialog from 'components/model-runner-modal/model-runner-dialog';
import ImportDatasetModal from 'components/import-dataset-modal/import-dataset-modal';
import { useDidUpdateEffect } from 'utils/hooks';
import DetailsComponent from './details';
import ProjectTopBar from './top-bar';

interface ParamType {
    id: string;
}

export default function ProjectPageComponent(): JSX.Element {
    const id = +useParams<ParamType>().id;
    const dispatch = useDispatch();
    const history = useHistory();
    const { search } = useLocation();
    const projects = useSelector((state: CombinedState) => state.projects.current).map((project) => project.instance);
    const projectsFetching = useSelector((state: CombinedState) => state.projects.fetching);
    const deletes = useSelector((state: CombinedState) => state.projects.activities.deletes);
    const taskDeletes = useSelector((state: CombinedState) => state.tasks.activities.deletes);
    const tasksActiveInferences = useSelector((state: CombinedState) => state.models.inferences);
    const tasks = useSelector((state: CombinedState) => state.tasks.current);
    const tasksCount = useSelector((state: CombinedState) => state.tasks.count);
    const tasksGettingQuery = useSelector((state: CombinedState) => state.projects.tasksGettingQuery);

    const [project] = projects.filter((_project) => _project.id === id);
    const projectSubsets: Array<string> = [];
    for (const task of tasks) {
        if (!projectSubsets.includes(task.instance.subset)) projectSubsets.push(task.instance.subset);
    }

    const deleteActivity = project && id in deletes ? deletes[id] : null;

    const onPageChange = useCallback(
        (p: number) => {
            dispatch(getProjectTasksAsync({
                projectId: id,
                page: p,
            }));
        },
        [],
    );

    useEffect(() => {
        const searchParams: Partial<TasksQuery> = {};
        for (const [param, value] of new URLSearchParams(search)) {
            searchParams[param] = ['page'].includes(param) ? Number.parseInt(value, 10) : value;
        }
        dispatch(getProjectsAsync({ id }, searchParams));
    }, []);

    useDidUpdateEffect(() => {
        const searchParams = new URLSearchParams();
        for (const [name, value] of Object.entries(tasksGettingQuery)) {
            if (value !== null && typeof value !== 'undefined' && !['projectId', 'ordering'].includes(name)) {
                searchParams.append(name, value.toString());
            }
        }
        history.push({
            pathname: `/projects/${id}`,
            search: `?${searchParams.toString()}`,
        });
    }, [tasksGettingQuery, id]);

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

    const paginationDimensions = {
        md: 22,
        lg: 18,
        xl: 16,
        xxl: 16,
    };

    return (
        <Row justify='center' align='top' className='cvat-project-page'>
            <Col md={22} lg={18} xl={16} xxl={14}>
                <ProjectTopBar projectInstance={project} />
                <DetailsComponent project={project} />
                <Row justify='space-between' align='middle' className='cvat-project-page-tasks-bar'>
                    <Col className='cvat-project-tasks-title-search'>
                        <Title level={3}>Tasks</Title>
                        <SearchField
                            query={tasksGettingQuery}
                            instance='task'
                            skipFields={['ordering', 'projectId']}
                            onSearch={(query: TasksQuery) => dispatch(getProjectTasksAsync(query))}
                        />
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
                <Row justify='center'>
                    <Col {...paginationDimensions}>
                        <Pagination
                            className='cvat-project-tasks-pagination'
                            onChange={onPageChange}
                            showSizeChanger={false}
                            total={tasksCount}
                            pageSize={10}
                            current={tasksGettingQuery.page}
                            showQuickJumper
                        />
                    </Col>
                </Row>
            </Col>
            <MoveTaskModal />
            <ModelRunnerDialog />
            <ImportDatasetModal />
        </Row>
    );
}
