// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import { useDispatch, useSelector, shallowEqual } from 'react-redux';
import React, { useEffect, useState, useCallback } from 'react';
import { useHistory } from 'react-router';
import Spin from 'antd/lib/spin';
import { Col, Row } from 'antd/lib/grid';
import Pagination from 'antd/lib/pagination';

import { TasksQuery, CombinedState, SelectedResourceType } from 'reducers';
import { updateHistoryFromQuery } from 'components/resource-sorting-filtering';
import TaskListContainer from 'containers/tasks-page/tasks-list';
import { getTasksAsync } from 'actions/tasks-actions';
import { anySearch } from 'utils/any-search';
import { useResourceQuery } from 'utils/hooks';
import { selectionActions } from 'actions/selection-actions';

import TopBar from './top-bar';
import EmptyListComponent from './empty-list';

interface Props {
    fetching: boolean;
    importing: boolean;
    query: TasksQuery;
    count: number;
    bulkFetching: boolean;
}

function TasksPageComponent(props: Readonly<Props>): JSX.Element {
    const {
        query, fetching, importing, count, bulkFetching,
    } = props;

    const dispatch = useDispatch();
    const history = useHistory();
    const [isMounted, setIsMounted] = useState(false);

    const { currentTasks, deletedTasks, selectedCount } = useSelector((state: CombinedState) => ({
        currentTasks: state.tasks.current,
        deletedTasks: state.tasks.activities.deletes,
        selectedCount: state.tasks.selected.length,
    }), shallowEqual);

    const onSelectAll = useCallback(() => {
        dispatch(selectionActions.selectResources(
            currentTasks.map((t) => t.id).filter((id) => !deletedTasks[id]),
            SelectedResourceType.TASKS,
        ));
    }, [currentTasks, deletedTasks]);

    const updatedQuery = useResourceQuery<TasksQuery>(query);

    useEffect(() => {
        dispatch(getTasksAsync({ ...updatedQuery }));
        setIsMounted(true);
    }, []);

    useEffect(() => {
        if (isMounted) {
            history.replace({
                search: updateHistoryFromQuery(query),
            });
        }
    }, [query]);

    const isAnySearch = anySearch<TasksQuery>(query);

    const content = count ? (
        <>
            <TaskListContainer />
            <Row justify='center' align='middle' className='cvat-resource-pagination-wrapper'>
                <Col md={22} lg={18} xl={16} xxl={14}>
                    <Pagination
                        className='cvat-tasks-pagination'
                        onChange={(page: number, pageSize: number) => {
                            dispatch(getTasksAsync({
                                ...query,
                                page,
                                pageSize,
                            }));
                        }}
                        total={count}
                        pageSize={query.pageSize}
                        current={query.page}
                        showQuickJumper
                        showSizeChanger
                    />
                </Col>
            </Row>
        </>
    ) : (
        <EmptyListComponent notFound={isAnySearch} />
    );

    return (
        <div className='cvat-tasks-page'>
            <TopBar
                onApplySearch={(search: string | null) => {
                    dispatch(
                        getTasksAsync({
                            ...query,
                            search,
                            page: 1,
                        }),
                    );
                }}
                onApplyFilter={(filter: string | null) => {
                    dispatch(
                        getTasksAsync({
                            ...query,
                            filter,
                            page: 1,
                        }),
                    );
                }}
                onApplySorting={(sorting: string | null) => {
                    dispatch(
                        getTasksAsync({
                            ...query,
                            sort: sorting,
                            page: 1,
                        }),
                    );
                }}
                query={updatedQuery}
                importing={importing}
                selectedCount={selectedCount}
                onSelectAll={onSelectAll}
            />
            { fetching && !bulkFetching ? (
                <div className='cvat-empty-tasks-list'>
                    <Spin size='large' className='cvat-spinner' />
                </div>
            ) : content }
        </div>
    );
}

export default React.memo(TasksPageComponent);
