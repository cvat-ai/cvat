// Copyright (C) 2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import { useDispatch, useSelector } from 'react-redux';
import React, { useEffect, useState } from 'react';
import { useHistory } from 'react-router';
import Spin from 'antd/lib/spin';
import { Col, Row } from 'antd/lib/grid';
import Pagination from 'antd/lib/pagination';

import { TasksQuery, Indexable, CombinedState } from 'reducers';
import { updateHistoryFromQuery } from 'components/resource-sorting-filtering';
import TaskListContainer from 'containers/tasks-page/tasks-list';
import { getTasksAsync } from 'actions/tasks-actions';

import { getCore } from 'cvat-core-wrapper';
import { getRequestsAsync } from 'actions/requests-actions';
import TopBar from './top-bar';
import EmptyListComponent from './empty-list';
import RequestCard from './request-card';

const core = getCore();

interface Props {
    fetching: boolean;
    importing: boolean;
    query: TasksQuery;
    count: number;
}

export default function RequestsPageComponent(): JSX.Element {
    const dispatch = useDispatch();
    const history = useHistory();
    const [isMounted, setIsMounted] = useState(false);
    const requests = useSelector((state: CombinedState) => state.requests.requests);
    const urls = useSelector((state: CombinedState) => state.requests.urls);
    const count = useSelector((state: CombinedState) => state.requests.count);
    const content = Object.values(requests).map((r) => <RequestCard request={r} urls={urls} />);

    useEffect(() => {
        dispatch(getRequestsAsync(false));
        setIsMounted(true);
    }, []);

    return count ? (
        <>
            <Row justify='center' align='top' className='cvat-requests-page' style={{ height: '90%' }}>
                <Col span={24}>
                    {content}
                </Col>
            </Row>
            <Row justify='center' align='middle'>
                <Col md={22} lg={18} xl={16} xxl={14}>
                    <Pagination
                        className='cvat-tasks-pagination'
                        onChange={(page: number) => {
                        }}
                        showSizeChanger={false}
                        total={count}
                        pageSize={10}
                        current={1}
                        showQuickJumper
                    />
                </Col>
            </Row>
        </>

    ) : null;
}
