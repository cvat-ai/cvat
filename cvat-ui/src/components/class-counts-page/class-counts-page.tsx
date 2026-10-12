// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import { Row, Col } from 'antd/lib/grid';
import Title from 'antd/lib/typography/Title';
import Table from 'antd/lib/table';
import notification from 'antd/lib/notification';

import { getCore } from 'cvat-core-wrapper';
import GoBackButton from 'components/common/go-back-button';
import CVATLoadingSpinner from 'components/common/loading-spinner';

const core = getCore();

const columns = [
    { title: 'Class', dataIndex: 'name' },
    { title: 'Annotations', dataIndex: 'count' },
];

interface ClassCount {
    name: string;
    count: number;
}

function ClassCountsPage(): JSX.Element {
    const taskId = +useParams<{ tid: string }>().tid;
    const [counts, setCounts] = useState<ClassCount[]>([]);
    const [fetching, setFetching] = useState(true);

    useEffect(() => {
        setFetching(true);
        core.server.request<{ data: { counts: ClassCount[] } }>(
            `${core.config.backendAPI}/tasks/${taskId}/class-counts`, { method: 'GET' },
        ).then((response) => {
            setCounts(response.data.counts);
        }).catch((error: unknown) => {
            notification.error({
                message: 'Could not receive class counts from the server',
                description: error instanceof Error ? error.message : '',
            });
        }).finally(() => {
            setFetching(false);
        });
    }, [taskId]);

    return (
        <div className='cvat-class-counts-page'>
            <Row justify='center'>
                <Col span={22} xl={18} xxl={14} className='cvat-task-top-bar'>
                    <GoBackButton />
                </Col>
            </Row>
            <Row justify='center'>
                <Col span={22} xl={18} xxl={14}>
                    <Title level={4}>{`Annotations per class in task #${taskId}`}</Title>
                    { fetching ? <CVATLoadingSpinner size='large' /> : (
                        <Table
                            className='cvat-class-counts-table'
                            columns={columns}
                            dataSource={counts}
                            rowKey='name'
                            size='small'
                            pagination={false}
                        />
                    ) }
                </Col>
            </Row>
        </div>
    );
}

export default React.memo(ClassCountsPage);
