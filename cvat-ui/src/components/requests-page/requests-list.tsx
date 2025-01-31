// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { shallowEqual, useDispatch, useSelector } from 'react-redux';
import { CombinedState, RequestsQuery } from 'reducers';

import { Row, Col } from 'antd/lib/grid';
import Pagination from 'antd/lib/pagination';

import { Request } from 'cvat-core-wrapper';
import { requestsActions } from 'actions/requests-actions';

import moment from 'moment';
import dimensions from 'utils/dimensions';
import RequestCard from './request-card';

export const PAGE_SIZE = 10;

interface Props {
    query: RequestsQuery;
    count: number;
}

function setUpRequestsList(requests: Request[], newPage: number): Request[] {
    const displayRequests = [...requests];
    displayRequests.sort((a, b) => moment(b.createdDate).valueOf() - moment(a.createdDate).valueOf());
    return displayRequests.slice((newPage - 1) * PAGE_SIZE, newPage * PAGE_SIZE);
}

function RequestsList(props: Props): JSX.Element {
    const dispatch = useDispatch();
    const { query, count } = props;
    const { page } = query;
    const { requests, disabled } = useSelector((state: CombinedState) => ({
        requests: state.requests.requests, disabled: state.requests.disabled,
    }), shallowEqual);

    const requestViews = setUpRequestsList(Object.values(requests), page)
        .map((request: Request): JSX.Element => (
            <RequestCard
                request={request}
                key={request.id}
                disabled={request.id in disabled}
            />
        ),
        );

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
                        dispatch(requestsActions.getRequests({ ...query, page: newPage }, false));
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

export default React.memo(RequestsList);
