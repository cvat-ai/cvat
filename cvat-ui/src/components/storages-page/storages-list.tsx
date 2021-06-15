// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';

import Pagination from 'antd/lib/pagination';
import { Row, Col } from 'antd/lib/grid';

export default function StoragesList(): JSX.Element {
    const dimensions = {
        md: 22, lg: 18, xl: 16, xxl: 14,
    };

    // todo: get count
    // todo: get page
    // todo: add action to change page

    function changePage() {

    }

    const storagesCount = 12;
    const page = 1;

    return (
        <>
            <Row justify='center' align='middle'>
                <Col className='cvat-storages-list' {...dimensions}>
                    {/* {projectInstances.map(
                        (row: any[]): JSX.Element => (
                            <Row key={row[0].id} gutter={[8, 8]}>
                                {row.map((instance: any) => (
                                    <Col span={6} key={instance.id}>
                                        <ProjectItem projectInstance={instance} />
                                    </Col>
                                ))}
                            </Row>
                        ),
                    )} */}
                </Col>
            </Row>
            <Row justify='center' align='middle'>
                <Col {...dimensions}>
                    <Pagination
                        className='cvat-projects-pagination'
                        onChange={changePage}
                        showSizeChanger={false}
                        total={storagesCount}
                        pageSize={20}
                        current={page}
                        showQuickJumper
                    />
                </Col>
            </Row>
        </>
    );
}
