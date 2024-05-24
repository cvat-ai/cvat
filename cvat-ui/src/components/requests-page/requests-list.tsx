// Copyright (C) 2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { useHistory } from 'react-router';
import { useDispatch, useSelector } from 'react-redux';
import { CombinedState, Indexable } from 'reducers';

import { Row, Col } from 'antd/lib/grid';
import Pagination from 'antd/lib/pagination';

import { Request } from 'cvat-core-wrapper';
import { getRequestsAsync } from 'actions/requests-async-actions';

import moment from 'moment';
import dimensions from 'utils/dimensions';
import RequestCard from './request-card';

export const PAGE_SIZE = 10;

function setUpRequestsList(requests: Request[], newPage: number): Request[] {
    const displayRequests = [...requests];
    displayRequests.sort((a, b) => moment(b.enqueuedDate).valueOf() - moment(a.enqueuedDate).valueOf());
    return displayRequests.slice((newPage - 1) * PAGE_SIZE, newPage * PAGE_SIZE);
}

function RequestsList(): JSX.Element {
    const dispatch = useDispatch();
    const history = useHistory();
    const requests = useSelector((state: CombinedState) => state.requests.requests);
    const count = useSelector((state: CombinedState) => state.requests.count);
    const query = useSelector((state: CombinedState) => state.requests.query);

    const queryParams = new URLSearchParams(history.location.search);
    const updatedQuery = { ...query };
    for (const key of Object.keys(updatedQuery)) {
        (updatedQuery as Indexable)[key] = queryParams.get(key) || null;
        if (key === 'page') {
            updatedQuery.page = updatedQuery.page ? +updatedQuery.page : 1;
        }
    }
    const { page } = updatedQuery;
    const requestViews = setUpRequestsList(Object.values(requests), page)
        .map((request: Request): JSX.Element => <RequestCard request={request} key={request.id} />);

    return (
        <>
            <Row justify='center'>
                <Col className='cvat-requests-list' {...dimensions}>
                    {requestViews}
                </Col>
            </Row>
            <Row justify='center' align='middle'>
                <Pagination
                    className='cvat-tasks-pagination'
                    onChange={(newPage: number) => {
                        dispatch(getRequestsAsync({
                            ...query,
                            page: newPage,
                        }));
                    }}
                    showSizeChanger={false}
                    total={count}
                    current={page}
                    pageSize={PAGE_SIZE}
                    showQuickJumper
                />
            </Row>
        </>
    );
}

export default RequestsList;
