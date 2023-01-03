// Copyright (C) 2019-2022 Intel Corporation
// Copyright (C) 2022 CVAT.ai Corporation
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
import Dropdown from 'antd/lib/dropdown';
import Title from 'antd/lib/typography/Title';
import Pagination from 'antd/lib/pagination';
import { MutliPlusIcon } from 'icons';
import { PlusOutlined } from '@ant-design/icons';
import Empty from 'antd/lib/empty';
import Input from 'antd/lib/input';

import { CombinedState, Task, Indexable } from 'reducers';
import { getProjectsAsync, getProjectTasksAsync } from 'actions/projects-actions';
import { cancelInferenceAsync } from 'actions/models-actions';
import TaskItem from 'components/tasks-page/task-item';
import MoveTaskModal from 'components/move-task-modal/move-task-modal';
import ModelRunnerDialog from 'components/model-runner-modal/model-runner-dialog';
import {
    SortingComponent, ResourceFilterHOC, defaultVisibility, updateHistoryFromQuery,
} from 'components/resource-sorting-filtering';
import CvatDropdownMenuPaper from 'components/common/cvat-dropdown-menu-paper';
import DetailsComponent from './details';
import ProjectTopBar from './top-bar';

import {
    localStorageRecentKeyword, localStorageRecentCapacity, predefinedFilterValues, config,
} from './project-tasks-filter-configuration';

const FilteringComponent = ResourceFilterHOC(
    config, localStorageRecentKeyword, localStorageRecentCapacity, predefinedFilterValues,
);

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
    const tasksCount = useSelector((state: CombinedState) => state.tasks.count);
    const tasksQuery = useSelector((state: CombinedState) => state.projects.tasksGettingQuery);
    const tasksFetching = useSelector((state: CombinedState) => state.tasks.fetching);
    const [isMounted, setIsMounted] = useState(false);
    const [visibility, setVisibility] = useState(defaultVisibility);

    const queryParams = new URLSearchParams(history.location.search);
    const updatedQuery = { ...tasksQuery };
    for (const key of Object.keys(updatedQuery)) {
        (updatedQuery as Indexable)[key] = queryParams.get(key) || null;
        if (key === 'page') {
            updatedQuery.page = updatedQuery.page ? +updatedQuery.page : 1;
        }
    }

    useEffect(() => {
        dispatch(getProjectTasksAsync({ ...updatedQuery, projectId: id }));
        setIsMounted(true);
    }, []);

    const [project] = projects.filter((_project) => _project.id === id);
    const projectSubsets: Array<string> = [];
    for (const task of tasks) {
        if (!projectSubsets.includes(task.instance.subset)) projectSubsets.push(task.instance.subset);
    }

    useEffect(() => {
        if (!project) {
            dispatch(getProjectsAsync({ id }, updatedQuery));
        }
    }, []);

    useEffect(() => {
        if (isMounted) {
            history.replace({
                search: updateHistoryFromQuery(tasksQuery),
            });
        }
    }, [tasksQuery]);

    useEffect(() => {
        if (project && id in deletes && deletes[id]) {
            history.push('/projects');
        }
    }, [deletes]);

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

    const content = tasksCount ? (
        <>
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
            <Row justify='center' align='middle'>
                <Col md={22} lg={18} xl={16} xxl={14}>
                    <Pagination
                        className='cvat-project-tasks-pagination'
                        onChange={(page: number) => {
                            dispatch(getProjectTasksAsync({
                                ...tasksQuery,
                                projectId: id,
                                page,
                            }));
                        }}
                        showSizeChanger={false}
                        total={tasksCount}
                        pageSize={10}
                        current={tasksQuery.page}
                        showQuickJumper
                    />
                </Col>
            </Row>
        </>
    ) : (
        <Empty description='No tasks found' />
    );

    return (
        <Row justify='center' align='top' className='cvat-project-page'>
            <Col md={22} lg={18} xl={16} xxl={14}>
                <ProjectTopBar projectInstance={project} />
                <DetailsComponent project={project} />
                <Row justify='space-between' align='middle' className='cvat-project-page-tasks-bar'>
                    <Col span={24}>
                        <div className='cvat-project-page-tasks-filters-wrapper'>
                            <Input.Search
                                enterButton
                                onSearch={(_search: string) => {
                                    dispatch(getProjectTasksAsync({
                                        ...tasksQuery,
                                        page: 1,
                                        projectId: id,
                                        search: _search,
                                    }));
                                }}
                                defaultValue={tasksQuery.search || ''}
                                className='cvat-project-page-tasks-search-bar'
                                placeholder='Search ...'
                            />
                            <div>
                                <SortingComponent
                                    visible={visibility.sorting}
                                    onVisibleChange={(visible: boolean) => (
                                        setVisibility({ ...defaultVisibility, sorting: visible })
                                    )}
                                    defaultFields={tasksQuery.sort?.split(',') || ['-ID']}
                                    sortingFields={['ID', 'Owner', 'Status', 'Assignee', 'Updated date', 'Subset', 'Mode', 'Dimension', 'Name']}
                                    onApplySorting={(sorting: string | null) => {
                                        dispatch(getProjectTasksAsync({
                                            ...tasksQuery,
                                            page: 1,
                                            projectId: id,
                                            sort: sorting,
                                        }));
                                    }}
                                />
                                <FilteringComponent
                                    value={updatedQuery.filter}
                                    predefinedVisible={visibility.predefined}
                                    builderVisible={visibility.builder}
                                    recentVisible={visibility.recent}
                                    onPredefinedVisibleChange={(visible: boolean) => (
                                        setVisibility({ ...defaultVisibility, predefined: visible })
                                    )}
                                    onBuilderVisibleChange={(visible: boolean) => (
                                        setVisibility({ ...defaultVisibility, builder: visible })
                                    )}
                                    onRecentVisibleChange={(visible: boolean) => (
                                        setVisibility({
                                            ...defaultVisibility,
                                            builder: visibility.builder,
                                            recent: visible,
                                        })
                                    )}
                                    onApplyFilter={(filter: string | null) => {
                                        dispatch(getProjectTasksAsync({
                                            ...tasksQuery,
                                            page: 1,
                                            projectId: id,
                                            filter,
                                        }));
                                    }}
                                />
                            </div>
                            <Dropdown
                                trigger={['click']}
                                overlay={(
                                    <CvatDropdownMenuPaper>
                                        <Button
                                            type='primary'
                                            icon={<PlusOutlined />}
                                            className='cvat-create-task-button'
                                            onClick={() => history.push(`/tasks/create?projectId=${id}`)}
                                        >
                                            Create a new task
                                        </Button>
                                        <Button
                                            type='primary'
                                            icon={<span className='anticon'><MutliPlusIcon /></span>}
                                            className='cvat-create-multi-tasks-button'
                                            onClick={() => history.push(`/tasks/create?projectId=${id}&many=true`)}
                                        >
                                            Create multi tasks
                                        </Button>
                                    </CvatDropdownMenuPaper>
                                )}
                            >
                                <Button
                                    type='primary'
                                    className='cvat-create-task-dropdown'
                                    icon={<PlusOutlined />}
                                />
                            </Dropdown>
                        </div>
                    </Col>
                </Row>
                { tasksFetching ? (
                    <Spin size='large' className='cvat-spinner' />
                ) : content }
            </Col>

            <MoveTaskModal />
            <ModelRunnerDialog />
        </Row>
    );
}
