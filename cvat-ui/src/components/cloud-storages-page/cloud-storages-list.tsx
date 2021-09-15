// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import Pagination from 'antd/lib/pagination';
import { Row, Col } from 'antd/lib/grid';

import { CloudStorage } from 'reducers/interfaces';
import CloudStorageItemComponent from './cloud-storage-item';

interface Props {
    storages: CloudStorage[];
    previews: string[];
    statuses: string[];
    totalCount: number;
    page: number;
    onChangePage(page: number): void;
}

export default function StoragesList(props: Props): JSX.Element {
    const {
        storages, previews, statuses, totalCount, page, onChangePage,
    } = props;

    const groupedStorages = storages.reduce(
        (acc: CloudStorage[][], storage: CloudStorage, index: number): CloudStorage[][] => {
            if (index && index % 4) {
                acc[acc.length - 1].push({
                    storage,
                    preview: previews[index],
                    status: statuses[index],
                });
            } else {
                acc.push([{
                    storage,
                    preview: previews[index],
                    status: statuses[index],
                }]);
            }

            return acc;
        },
        [],
    );

    return (
        <>
            <Row justify='center' align='middle'>
                <Col span={24} className='cvat-cloud-storages-list'>
                    {groupedStorages.map(
                        (instances: CloudStorage[]): JSX.Element => (
                            <Row key={instances[0].storage.id} gutter={[8, 8]}>
                                {instances.map((instance: CloudStorage) => (
                                    <Col span={6} key={instance.storage.id}>
                                        <CloudStorageItemComponent cloudStorageInstance={instance} />
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
