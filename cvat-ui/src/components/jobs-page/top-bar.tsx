// Copyright (C) 2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { Col, Row } from 'antd/lib/grid';
import Text from 'antd/lib/typography/Text';

import SortingComponent from './sorting';
import ResourceFilterHOC from './filtering';
import {
    localStorageRecentKeyword, localStorageRecentCapacity,
    predefinedFilterValues, defaultEnabledFilters, config,
} from './jobs-filter-configuration';

const FilteringComponent = ResourceFilterHOC(
    config, localStorageRecentKeyword, localStorageRecentCapacity,
    predefinedFilterValues, defaultEnabledFilters,
);

interface Props {
    onApplyFilter(filter: string | null): void;
    onApplySorting(sorting: string | null): void;
}

function TopBarComponent(props: Props): JSX.Element {
    const { onApplyFilter, onApplySorting } = props;
    return (
        <Row className='cvat-jobs-page-top-bar' justify='center' align='middle'>
            <Col md={22} lg={18} xl={16} xxl={16}>
                <Text className='cvat-title'>Jobs</Text>
                <div>
                    <SortingComponent sortingFields={['id', 'assignee']} onApplySorting={onApplySorting} />
                    <FilteringComponent onApplyFilter={onApplyFilter} />
                </div>
            </Col>
        </Row>
    );
}

export default React.memo(TopBarComponent);
