// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
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
    pageSize: number;
    onChangePage(page: number, pageSize: number): void;
}

export default function StoragesList(props: Props): JSX.Element {
    const {
        storages, totalCount, page, pageSize, onChangePage,
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
            <Row justify='center' align='middle' className='cvat-resource-list-wrapper'>
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
            <Row justify='center' align='middle' className='cvat-resource-pagination-wrapper'>
                <Col>
                    <Pagination
                        className='cvat-cloud-storages-pagination'
                        onChange={onChangePage}
                        total={totalCount}
                        current={page}
                        pageSize={pageSize}
                        showQuickJumper
                        showSizeChanger
                        pageSizeOptions={[12, 24, 48, 96]}
                    />
                </Col>
            </Row>
        </>
    );
}
