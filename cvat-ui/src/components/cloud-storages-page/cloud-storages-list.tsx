// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) 2022-2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import Pagination from 'antd/lib/pagination';
import { Row, Col } from 'antd/lib/grid';

import { CloudStorage } from 'reducers';
import dimensions from 'utils/dimensions';
import CloudStorageItemComponent from './cloud-storage-item';

interface Props {
    storages: CloudStorage[];
    totalCount: number;
    page: number;
    onChangePage(page: number): void;
}

export default function StoragesList(props: Props): JSX.Element {
    const {
        storages, totalCount, page, onChangePage,
    } = props;

    const groupedStorages = storages.reduce(
        (acc: CloudStorage[][], storage: CloudStorage, index: number): CloudStorage[][] => {
            if (index && index % 4) {
                acc[acc.length - 1].push(storage);
            } else {
                acc.push([storage]);
            }
            return acc;
        },
        [],
    );

    return (
        <>
            <Row justify='center' align='middle'>
                <Col {...dimensions} className='cvat-cloud-storages-list'>
                    {groupedStorages.map(
                        (instances: CloudStorage[]): JSX.Element => (
                            <Row key={instances[0].id} gutter={[8, 8]}>
                                {instances.map((instance: CloudStorage) => (
                                    <Col span={6} key={instance.id}>
                                        <CloudStorageItemComponent cloudStorage={instance} />
                                    </Col>
                                ))}
                            </Row>
                        ),
                    )}
                </Col>
            </Row>
            <Row justify='center' align='middle'>
                <Col>
                    <Pagination
                        className='cvat-cloud-storages-pagination'
                        onChange={onChangePage}
                        showSizeChanger={false}
                        total={totalCount}
                        pageSize={12}
                        current={page}
                        showQuickJumper
                    />
                </Col>
            </Row>
        </>
    );
}
