// Copyright (C) 2022 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React, { useCallback, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
    useHistory, useRouteMatch,
} from 'react-router';
import Spin from 'antd/lib/spin';
import { Row, Col } from 'antd/lib/grid';
import Pagination from 'antd/lib/pagination';
import Button from 'antd/lib/button';

import { CombinedState, Indexable } from 'reducers';
import { updateHistoryFromQuery } from 'components/resource-sorting-filtering';
import { getWebhooksAsync } from 'actions/webhooks-actions';
import { LeftOutlined } from '@ant-design/icons';
import WebhooksList from './webhooks-list';
import TopBar from './top-bar';
import EmptyWebhooksListComponent from './empty-list';

interface ProjectRouteMatch {
    id?: string | undefined;
}

const PAGE_SIZE = 10;

function WebhooksPage(): JSX.Element | null {
    const dispatch = useDispatch();
    const history = useHistory();
    const organization = useSelector((state: CombinedState) => state.organizations.current);
    const fetching = useSelector((state: CombinedState) => state.webhooks.fetching);
    const totalCount = useSelector((state: CombinedState) => state.webhooks.totalCount);
    const query = useSelector((state: CombinedState) => state.webhooks.query);

    const projectsMatch = useRouteMatch<ProjectRouteMatch>({ path: '/projects/:id/webhooks' });

    const [onCreateParams, setOnCreateParams] = useState<string | null>(null);
    const onCreateWebhook = useCallback(() => {
        history.push(`/webhooks/create?${onCreateParams || ''}`);
    }, [onCreateParams]);

    const goBackContent = (
        <Button
            className='cvat-webhooks-go-back'
            onClick={() => history.push(projectsMatch ? `/projects/${projectsMatch.params.id}` : '/organization')}
            type='link'
            size='large'
        >
            <LeftOutlined />
            {projectsMatch ? 'Back to project' : 'Back to organization'}
        </Button>
    );

    const queryParams = new URLSearchParams(history.location.search);
    const updatedQuery = { ...query };
    for (const key of Object.keys(updatedQuery)) {
        (updatedQuery as Indexable)[key] = queryParams.get(key) || null;
        if (key === 'page') {
            updatedQuery.page = updatedQuery.page ? +updatedQuery.page : 1;
        }
    }

    useEffect(() => {
        if (projectsMatch && projectsMatch.params.id) {
            const { id } = projectsMatch.params;
            setOnCreateParams(`projectId=${id}`);
            dispatch(getWebhooksAsync({ ...updatedQuery, projectId: +id }));
        } else if (organization) {
            dispatch(getWebhooksAsync(updatedQuery));
        } else {
            history.push('/');
        }
    }, [organization]);

    useEffect(() => {
        history.replace({
            search: updateHistoryFromQuery(query),
        });
    }, [query]);

    const content = totalCount ? (
        <>
            <WebhooksList />
            <Row justify='center' align='middle'>
                <Col md={22} lg={18} xl={16} xxl={14}>
                    <Pagination
                        className='cvat-tasks-pagination'
                        onChange={(page: number) => {
                            dispatch(getWebhooksAsync({
                                ...query,
                                page,
                            }));
                        }}
                        showSizeChanger={false}
                        total={totalCount}
                        current={query.page}
                        pageSize={PAGE_SIZE}
                        showQuickJumper
                    />
                </Col>
            </Row>
        </>
    ) : <EmptyWebhooksListComponent query={query} />;

    return (
        <div className='cvat-webhooks-page'>
            <TopBar
                query={updatedQuery}
                onCreateWebhook={onCreateWebhook}
                goBackContent={goBackContent}
                onApplySearch={(search: string | null) => {
                    dispatch(
                        getWebhooksAsync({
                            ...query,
                            search,
                            page: 1,
                        }),
                    );
                }}
                onApplyFilter={(filter: string | null) => {
                    dispatch(
                        getWebhooksAsync({
                            ...query,
                            filter,
                            page: 1,
                        }),
                    );
                }}
                onApplySorting={(sorting: string | null) => {
                    dispatch(
                        getWebhooksAsync({
                            ...query,
                            sort: sorting,
                            page: 1,
                        }),
                    );
                }}
            />
            { fetching ? (
                <div className='cvat-empty-webhooks-list'>
                    <Spin size='large' className='cvat-spinner' />
                </div>
            ) : content }
        </div>
    );
}

export default React.memo(WebhooksPage);
