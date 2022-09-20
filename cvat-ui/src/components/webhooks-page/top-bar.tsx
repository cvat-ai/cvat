// Copyright (C) 2022 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useState } from 'react';
import { Row, Col } from 'antd/lib/grid';
import { PlusOutlined } from '@ant-design/icons';
import Button from 'antd/lib/button';
import Input from 'antd/lib/input';

import { SortingComponent, ResourceFilterHOC, defaultVisibility } from 'components/resource-sorting-filtering';
import { WebhooksQuery } from 'reducers';
import {
    localStorageRecentKeyword, localStorageRecentCapacity, config,
} from './webhooks-filter-configuration';

const FilteringComponent = ResourceFilterHOC(
    config, localStorageRecentKeyword, localStorageRecentCapacity,
);

interface VisibleTopBarProps {
    onApplyFilter(filter: string | null): void;
    onApplySorting(sorting: string | null): void;
    onApplySearch(search: string | null): void;
    query: WebhooksQuery;
    onCreateWebhook(): void;
    goBackContent: JSX.Element;
}

export default function TopBarComponent(props: VisibleTopBarProps): JSX.Element {
    const {
        query, onApplyFilter, onApplySorting, onApplySearch, onCreateWebhook, goBackContent,
    } = props;
    const [visibility, setVisibility] = useState(defaultVisibility);

    return (
        <>
            <Row justify='center' align='middle'>
                <Col md={22} lg={18} xl={16} xxl={14}>
                    {goBackContent}
                </Col>
            </Row>
            <Row className='cvat-webhooks-page-top-bar' justify='center' align='middle'>
                <Col md={22} lg={18} xl={16} xxl={14}>
                    <div className='cvat-webhooks-page-filters-wrapper'>
                        <Input.Search
                            enterButton
                            onSearch={(phrase: string) => {
                                onApplySearch(phrase);
                            }}
                            defaultValue={query.search || ''}
                            className='cvat-webhooks-page-search-bar'
                            placeholder='Search ...'
                        />
                        <div>
                            <SortingComponent
                                visible={visibility.sorting}
                                onVisibleChange={(visible: boolean) => (
                                    setVisibility({ ...defaultVisibility, sorting: visible })
                                )}
                                defaultFields={query.sort?.split(',') || ['-ID']}
                                sortingFields={['ID', 'Target URL', 'Owner', 'Description', 'Type', 'Updated date']}
                                onApplySorting={onApplySorting}
                            />
                            <FilteringComponent
                                value={query.filter}
                                predefinedVisible={visibility.predefined}
                                builderVisible={visibility.builder}
                                recentVisible={visibility.recent}
                                onPredefinedVisibleChange={(visible: boolean) => (
                                    setVisibility({ ...defaultVisibility, predefined: visible })
                                )}
                                onBuilderVisibleChange={(visible: boolean) => (
                                    setVisibility({ ...defaultVisibility, builder: visible })
                                )}
                                onRecentVisibleChange={(visible: boolean) => (
                                    setVisibility({
                                        ...defaultVisibility,
                                        builder: visibility.builder,
                                        recent: visible,
                                    })
                                )}
                                onApplyFilter={onApplyFilter}
                            />
                        </div>
                    </div>
                    <div className='cvat-webhooks-add-wrapper'>
                        <Button onClick={onCreateWebhook} type='primary' className='cvat-create-webhook' icon={<PlusOutlined />} />
                    </div>
                </Col>
            </Row>
        </>
    );
}
