// Copyright (C) 2022 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useHistory } from 'react-router';
import Spin from 'antd/lib/spin';
import { Row, Col } from 'antd/lib/grid';
import Pagination from 'antd/lib/pagination';

import { CombinedState, Indexable } from 'reducers/interfaces';
import { updateHistoryFromQuery } from 'components/resource-sorting-filtering';
import { getWebhooksAsync } from 'actions/webhooks-actions';
import WebhooksList from './webhooks-list';
import TopBar from './top-bar';

const PAGE_SIZE = 10;

function WebhooksPage(): JSX.Element | null {
    const dispatch = useDispatch();
    const history = useHistory();
    const fetching = useSelector((state: CombinedState) => state.webhooks.fetching);
    const totalCount = useSelector((state: CombinedState) => state.webhooks.totalCount);
    const query = useSelector((state: CombinedState) => state.webhooks.query);
    const organization = useSelector((state: CombinedState) => state.organizations.current);

    const queryParams = new URLSearchParams(history.location.search);
    const updatedQuery = { ...query };
    for (const key of Object.keys(updatedQuery)) {
        (updatedQuery as Indexable)[key] = queryParams.get(key) || null;
        if (key === 'page') {
            updatedQuery.page = updatedQuery.page ? +updatedQuery.page : 1;
        }
    }

    useEffect(() => {
        if (!organization) {
            // currently available only in an organization
            history.push('/');
        }
    }, [organization]);

    useEffect(() => {
        dispatch(getWebhooksAsync(updatedQuery));
    }, []);

    useEffect(() => {
        history.replace({
            search: updateHistoryFromQuery(query),
        });
    }, [query]);

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
                            dispatch(getWebhooksAsync({ page }));
                        }}
                        showSizeChanger={false}
                        total={totalCount}
                        current={query.page}
                        pageSize={PAGE_SIZE}
                        showQuickJumper
                    />
                </Col>
            </Row>
        </div>
    );
}

export default React.memo(WebhooksPage);
