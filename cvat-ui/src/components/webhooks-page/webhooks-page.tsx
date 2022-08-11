// Copyright (C) 2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Spin from 'antd/lib/spin';

import { CombinedState } from 'reducers/interfaces';
import { getWebhooksAsync } from 'actions/webhooks-actions';
import { Row, Col, Pagination } from 'antd';
import WebhooksList from './webhooks-list';
import TopBar from './top-bar';

function WebhooksPage(): JSX.Element | null {
    const [pageNumber, setPageNumber] = useState<number>(1);
    const [pageSize, setPageSize] = useState<number>(10);
    const fetching = useSelector((state: CombinedState) => state.webhooks.fetching);

    const dispatch = useDispatch();
    useEffect(() => {
        dispatch(getWebhooksAsync());
    }, []);

    if (fetching) {
        return <Spin className='cvat-spinner' />;
    }

    return (
        <div className='cvat-webhooks-page'>
            <TopBar />
            <WebhooksList />
            <Row justify='center' align='middle'>
                <Col md={22} lg={18} xl={16} xxl={14}>
                    <Pagination
                        className='cvat-tasks-pagination'
                        onChange={(page: number) => {
                            // fetchWebhooks(organization, page, pageSize, setWebhooks, setWebhooksFetching);
                        }}
                        showSizeChanger={false}
                        total={5}
                        pageSize={10}
                        current={1}
                        showQuickJumper
                    />
                </Col>
            </Row>
        </div>
    );
}

export default React.memo(WebhooksPage);
