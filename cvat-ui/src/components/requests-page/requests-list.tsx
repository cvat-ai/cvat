// Copyright (C) 2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { Row, Col } from 'antd/lib/grid';
import { Request } from 'cvat-core-wrapper';
import { useDispatch, useSelector } from 'react-redux';
import { CombinedState } from 'reducers';
import Pagination from 'antd/lib/pagination';
import { getRequestsAsync } from 'actions/requests-actions';
import moment from 'moment';
import dimensions from '../../utils/dimensions';
import RequestCard from './request-card';

export const PAGE_SIZE = 7;

function setUpRequestsList(requests: Request[], newPage: number): Request[] {
    const displayRequests = [...requests];
    displayRequests.sort((a, b) => moment(a.enqueueDate).valueOf() - moment(b.enqueueDate).valueOf());
    return displayRequests.slice((newPage - 1) * PAGE_SIZE, newPage * PAGE_SIZE);
}

function RequestsList(): JSX.Element {
    const dispatch = useDispatch();
    const requests = useSelector((state: CombinedState) => state.requests.requests);
    const count = useSelector((state: CombinedState) => state.requests.count);
    const query = useSelector((state: CombinedState) => state.requests.query);
    const { page } = query;
    const requestViews = setUpRequestsList(Object.values(requests), page)
        .map((request: Request): JSX.Element => <RequestCard request={request} key={request.id} />);

    return (
        <>
            <Row justify='center' align='middle'>
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
                        }, false));
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
