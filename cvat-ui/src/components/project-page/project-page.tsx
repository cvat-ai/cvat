// Copyright (C) 2019-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React, { useEffect, useRef, useState } from 'react';
import { useSelector, useDispatch, shallowEqual } from 'react-redux';
import { useHistory, useParams } from 'react-router';
import Spin from 'antd/lib/spin';
import { Row, Col } from 'antd/lib/grid';
import Button from 'antd/lib/button';
import Popover from 'antd/lib/popover';
import Title from 'antd/lib/typography/Title';
import Pagination from 'antd/lib/pagination';
import { MultiPlusIcon } from 'icons';
import { PlusOutlined } from '@ant-design/icons';
import Empty from 'antd/lib/empty';
import Input from 'antd/lib/input';
import notification from 'antd/lib/notification';

import { getCore, Project, Task } from 'cvat-core-wrapper';
import { CombinedState, TasksQuery } from 'reducers';
import { getProjectTasksAsync, updateProjectAsync } from 'actions/projects-actions';
import CVATLoadingSpinner from 'components/common/loading-spinner';
import TaskItem from 'containers/tasks-page/task-item';
import MoveTaskModal from 'components/move-task-modal/move-task-modal';
import ModelRunnerDialog from 'components/model-runner-modal/model-runner-dialog';
import {
    SortingComponent, ResourceFilterHOC, defaultVisibility, updateHistoryFromQuery,
} from 'components/resource-sorting-filtering';
import CvatDropdownMenuPaper from 'components/common/cvat-dropdown-menu-paper';
import { ProjectNotFoundComponent } from 'components/common/not-found';

import { useResourceQuery } from 'utils/hooks';
import DetailsComponent from './details';
import ProjectTopBar from './top-bar';

import {
    localStorageRecentKeyword, localStorageRecentCapacity, predefinedFilterValues, config,
} from './project-tasks-filter-configuration';

const core = getCore();

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

    const [projectInstance, setProjectInstance] = useState<Project | null>(null);
    const [fechingProject, setFetchingProject] = useState(true);
    const mounted = useRef(false);

    const {
        deletes,
        updates,
        tasks,
        tasksCount,
        tasksQuery,
        tasksFetching,
    } = useSelector((state: CombinedState) => ({
        deletes: state.projects.activities.deletes,
        updates: state.projects.activities.updates,
        tasks: state.tasks.current,
        tasksCount: state.tasks.count,
        tasksQuery: state.projects.tasksGettingQuery,
        tasksFetching: state.tasks.fetching,
    }), shallowEqual);
    const [visibility, setVisibility] = useState(defaultVisibility);

    const updatedQuery = useResourceQuery<TasksQuery>(tasksQuery);

    const isProjectUpdating = updates[id];

    useEffect(() => {
        if (Number.isInteger(id)) {
            core.projects.get({ id })
                .then(([project]: Project[]) => {
                    if (project && mounted.current) {
                        dispatch(getProjectTasksAsync({ ...updatedQuery, projectId: id }));
                        setProjectInstance(project);
                    }
                }).catch((error: Error) => {
                    if (mounted.current) {
                        notification.error({
                            message: 'Could not receive the requested project from the server',
                            description: error.toString(),
                        });
                    }
                }).finally(() => {
                    if (mounted.current) {
                        setFetchingProject(false);
                    }
                });
        } else {
            notification.error({
                message: 'Could not receive the requested project from the server',
                description: `Requested project id "${id}" is not valid`,
            });
            setFetchingProject(false);
        }

        mounted.current = true;
        return () => {
            mounted.current = false;
        };
    }, []);

    useEffect(() => {
        history.replace({
            search: updateHistoryFromQuery(tasksQuery),
        });
    }, [tasksQuery]);

    useEffect(() => {
        if (deletes[id]) {
            history.push('/projects');
        }
    }, [deletes]);

    if (fechingProject || id in deletes) {
        return <Spin size='large' className='cvat-spinner' />;
    }

    if (!projectInstance) {
        return <ProjectNotFoundComponent />;
    }

    const subsets = Array.from(
        new Set<string>(tasks.map((task: Task) => task.subset)),
    );
    const content = tasksCount ? (
        <>
            {subsets.map((subset: string) => (
                <React.Fragment key={subset}>
                    {subset && <Title level={4}>{subset}</Title>}
                    {tasks
                        .filter((task) => task.projectId === projectInstance.id && task.subset === subset)
                        .map((task: Task) => (
                            <TaskItem
                                key={task.id}
                                taskID={task.id}
                                idx={tasks.indexOf(task)}
                            />
                        ))}
                </React.Fragment>
            ))}
            <Row justify='center' align='middle'>
                <Col md={22} lg={18} xl={16} xxl={14}>
                    <Pagination
                        className='cvat-project-tasks-pagination'
                        onChange={(page: number, pageSize: number) => {
                            dispatch(getProjectTasksAsync({
                                ...tasksQuery,
                                projectId: id,
                                page,
                                pageSize,
                            }));
                        }}
                        total={tasksCount}
                        pageSize={tasksQuery.pageSize}
                        current={tasksQuery.page}
                        showQuickJumper
                        showSizeChanger
                    />
                </Col>
            </Row>
        </>
    ) : (
        <Empty description='No tasks found' />
    );

    return (
        <Row justify='center' align='top' className='cvat-project-page'>
            { isProjectUpdating ? <CVATLoadingSpinner size='large' /> : null }
            <Col
                md={22}
                lg={18}
                xl={16}
                xxl={14}
                style={isProjectUpdating ? {
                    pointerEvents: 'none',
                    opacity: 0.7,
                } : {}}
            >
                <ProjectTopBar projectInstance={projectInstance} />
                <DetailsComponent
                    onUpdateProject={(project: Project) => {
                        dispatch(updateProjectAsync(project)).then((updatedProject: Project) => {
                            setProjectInstance(updatedProject);
                        });
                    }}
                    project={projectInstance}
                />
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
                                defaultValue={tasksQuery.search ?? ''}
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
                        </div>
                        <Popover
                            trigger={['click']}
                            destroyTooltipOnHide
                            overlayInnerStyle={{ padding: 0 }}
                            content={(
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
                                        icon={<span className='anticon'><MultiPlusIcon /></span>}
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
                        </Popover>
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
