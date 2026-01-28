// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import Pagination from 'antd/lib/pagination';
import { Row, Col } from 'antd/lib/grid';

import { CloudStorage, SelectedResourceType } from 'reducers';
import dimensions from 'utils/dimensions';
import BulkWrapper from 'components/bulk-wrapper';
import CloudStorageItemComponent from './cloud-storage-item';

interface Props {
    storages: CloudStorage[];
    totalCount: number;
    page: number;
    pageSize: number;
    onChangePage(page: number, pageSize: number): void;
}

export default function StoragesList(props: Readonly<Props>): JSX.Element {
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

    const storageIdToIndex = new Map<number, number>();
    storages.forEach((s, idx) => storageIdToIndex.set(s.id, idx));

    return (
        <>
            <Row justify='center' align='middle' className='cvat-resource-list-wrapper'>
                <Col {...dimensions} className='cvat-cloud-storages-list'>
                    <BulkWrapper
                        currentResourceIds={storages.map((s) => s.id)}
                        resourceType={SelectedResourceType.CLOUD_STORAGES}
                    >
                        {(selectProps) => {
                            const renderStorageRow = (instances: CloudStorage[]): JSX.Element => (
                                <Row key={instances[0].id} className='cvat-cloud-storages-list-row'>
                                    {instances.map((instance: CloudStorage) => {
                                        const globalIdx = storageIdToIndex.get(instance.id) ?? 0;
                                        return (
                                            <Col span={6} key={instance.id}>
                                                <CloudStorageItemComponent
                                                    cloudStorage={instance}
                                                    {...selectProps(instance.id, globalIdx)}
                                                />
                                            </Col>
                                        );
                                    })}
                                </Row>
                            );
                            return groupedStorages.map(renderStorageRow);
                        }}
                    </BulkWrapper>
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
