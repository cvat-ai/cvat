// Copyright (C) 2022 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useState, useEffect } from 'react';
import { useHistory } from 'react-router';
import { Row, Col } from 'antd/lib/grid';
import Dropdown from 'antd/lib/dropdown';
import {
    PlusOutlined, UploadOutlined, LoadingOutlined, LeftOutlined,
} from '@ant-design/icons';
import Button from 'antd/lib/button';
import Upload from 'antd/lib/upload';
import Input from 'antd/lib/input';

import { SortingComponent, ResourceFilterHOC, defaultVisibility } from 'components/resource-sorting-filtering';
import { WebhooksQuery } from 'reducers';
import { usePrevious } from 'utils/hooks';
import {
    localStorageRecentKeyword, localStorageRecentCapacity, predefinedFilterValues, config,
} from '../tasks-page/tasks-filter-configuration';

const FilteringComponent = ResourceFilterHOC(
    config, localStorageRecentKeyword, localStorageRecentCapacity, predefinedFilterValues,
);

interface VisibleTopBarProps {
    onApplyFilter(filter: string | null): void;
    onApplySorting(sorting: string | null): void;
    onApplySearch(search: string | null): void;
    query: WebhooksQuery;
    importing: boolean;
    onCreateWebhook(): void;
    goBackContent: JSX.Element;
}

export default function TopBarComponent(props: VisibleTopBarProps): JSX.Element {
    const {
        importing, query, onApplyFilter, onApplySorting, onApplySearch, onImportTask, onCreateWebhook, goBackContent,
    } = props;
    const [visibility, setVisibility] = useState(defaultVisibility);
    const history = useHistory();
    const prevImporting = usePrevious(importing);

    useEffect(() => {
        if (prevImporting && !importing) {
            onApplyFilter(query.filter);
        }
    }, [importing]);

    // TODO: filtering and sorting need to be implemented
    return (
        <>
            <Row justify='center' align='middle'>
                <Col md={22} lg={18} xl={16} xxl={14}>
                    {goBackContent}
                </Col>
            </Row>
            <Row className='cvat-webhooks-page-top-bar' justify='center' align='middle'>
                <Col md={22} lg={18} xl={16} xxl={14}>
                    <Row justify='end' align='middle'>
                        <Col>
                            <div className='cvat-webhooks-page-filters-wrapper'>
                                {/* <Input.Search
                                    enterButton
                                    onSearch={(phrase: string) => {
                                        onApplySearch(phrase);
                                    }}
                                    // defaultValue={query.search || ''}
                                    className='cvat-webhooks-page-search-bar'
                                    placeholder='Search ...'
                                /> */}
                                {/* <div>
                        <SortingComponent
                            visible={visibility.sorting}
                            onVisibleChange={(visible: boolean) => (
                                setVisibility({ ...defaultVisibility, sorting: visible })
                            )}
                            // defaultFields={query.sort?.split(',') || ['-ID']}
                            sortingFields={['ID', 'Owner', 'Status', 'Assignee', 'Updated date', 'Subset', 'Mode', 'Dimension', 'Project ID', 'Name', 'Project name']}
                            onApplySorting={onApplySorting}
                        />
                        <FilteringComponent
                            // value={query.filter}
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
                                setVisibility({ ...defaultVisibility, builder: visibility.builder, recent: visible })
                            )}
                            onApplyFilter={onApplyFilter}
                        />
                    </div> */}
                            </div>
                        </Col>
                        <Col>
                            <div className='cvat-webhooks-add-wrapper'>
                                <Button onClick={onCreateWebhook} type='primary' className='cvat-create-webhook' icon={<PlusOutlined />} />
                            </div>
                        </Col>
                    </Row>

                </Col>
            </Row>
        </>
    );
}
