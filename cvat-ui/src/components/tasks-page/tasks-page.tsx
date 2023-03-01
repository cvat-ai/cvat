// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) 2022 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import { useDispatch } from 'react-redux';
import React, { useEffect, useState } from 'react';
import { useHistory } from 'react-router';
import Spin from 'antd/lib/spin';
import Button from 'antd/lib/button';
import message from 'antd/lib/message';
import Text from 'antd/lib/typography/Text';
import { Col, Row } from 'antd/lib/grid';
import Pagination from 'antd/lib/pagination';

import { TasksQuery, Indexable } from 'reducers';
import FeedbackComponent from 'components/feedback/feedback';
import { updateHistoryFromQuery } from 'components/resource-sorting-filtering';
import TaskListContainer from 'containers/tasks-page/tasks-list';
import { getTasksAsync, hideEmptyTasks } from 'actions/tasks-actions';

import TopBar from './top-bar';
import EmptyListComponent from './empty-list';

interface Props {
    fetching: boolean;
    importing: boolean;
    query: TasksQuery;
    count: number;
    countInvisible: number;
}

function TasksPageComponent(props: Props): JSX.Element {
    const {
        query, fetching, importing, count, countInvisible,
    } = props;

    const dispatch = useDispatch();
    const history = useHistory();
    const [isMounted, setIsMounted] = useState(false);

    const queryParams = new URLSearchParams(history.location.search);
    const updatedQuery = { ...query };
    for (const key of Object.keys(updatedQuery)) {
        (updatedQuery as Indexable)[key] = queryParams.get(key) || null;
        if (key === 'page') {
            updatedQuery.page = updatedQuery.page ? +updatedQuery.page : 1;
        }
    }

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

    useEffect(() => {
        if (countInvisible) {
            message.destroy();
            message.info(
                <>
                    <Text>Some tasks are temporary hidden because they are not fully created yet</Text>
                    <Button
                        className='cvat-show-all-tasks-button'
                        type='link'
                        onClick={(): void => {
                            dispatch(hideEmptyTasks(false));
                            message.destroy();
                        }}
                    >
                        Show all
                    </Button>
                </>,
                5,
            );
        }
    }, [countInvisible]);

    const content = count ? (
        <>
            <TaskListContainer />
            <Row justify='center' align='middle'>
                <Col md={22} lg={18} xl={16} xxl={14}>
                    <Pagination
                        className='cvat-tasks-pagination'
                        onChange={(page: number) => {
                            dispatch(getTasksAsync({
                                ...query,
                                page,
                            }));
                        }}
                        showSizeChanger={false}
                        total={count}
                        pageSize={10}
                        current={query.page}
                        showQuickJumper
                    />
                </Col>
            </Row>
        </>
    ) : (
        <EmptyListComponent query={query} />
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
            />
            { fetching ? (
                <div className='cvat-empty-tasks-list'>
                    <Spin size='large' className='cvat-spinner' />
                </div>
            ) : content }
            <FeedbackComponent />
        </div>
    );
}

export default React.memo(TasksPageComponent);
