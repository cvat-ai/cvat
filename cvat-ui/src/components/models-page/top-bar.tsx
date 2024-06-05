// Copyright (C) 2022-2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useState } from 'react';
import { Row, Col } from 'antd/lib/grid';
import { Input } from 'antd';
import { SortingComponent, ResourceFilterHOC, defaultVisibility } from 'components/resource-sorting-filtering';
import { CombinedState, ModelsQuery } from 'reducers';
import { usePlugins } from 'utils/hooks';
import dimensions from 'utils/dimensions';
import {
    localStorageRecentKeyword, localStorageRecentCapacity, config,
} from './models-filter-configuration';

const FilteringComponent = ResourceFilterHOC(
    config, localStorageRecentKeyword, localStorageRecentCapacity,
);

interface VisibleTopBarProps {
    onApplyFilter(filter: string | null): void;
    onApplySorting(sorting: string | null): void;
    onApplySearch(search: string | null): void;
    query: ModelsQuery;
    disabled?: boolean;
}

export default function TopBarComponent(props: VisibleTopBarProps): JSX.Element {
    const {
        query, onApplyFilter, onApplySorting, onApplySearch, disabled,
    } = props;
    const [visibility, setVisibility] = useState(defaultVisibility);
    const plugins = usePlugins((state: CombinedState) => state.plugins.components.modelsPage.topBar.items, props);
    const controls = [];
    if (plugins.length) {
        controls.push(
            ...plugins.map(({ component: Component }, index) => (
                <Component key={index} targetProps={props} />
            )),
        );
    }

    return (
        <Row className='cvat-models-page-top-bar' justify='center' align='middle'>
            <Col {...dimensions}>
                <div className='cvat-models-page-filters-wrapper'>
                    <Input.Search
                        disabled={disabled}
                        enterButton
                        onSearch={(phrase: string) => {
                            onApplySearch(phrase);
                        }}
                        defaultValue={query.search || ''}
                        className='cvat-models-page-search-bar'
                        placeholder='Search ...'
                    />
                    <div>
                        <SortingComponent
                            disabled={disabled}
                            visible={visibility.sorting}
                            onVisibleChange={(visible: boolean) => (
                                setVisibility({ ...defaultVisibility, sorting: visible })
                            )}
                            defaultFields={query.sort?.split(',') || ['-ID']}
                            sortingFields={['ID', 'Target URL', 'Owner', 'Description', 'Type', 'Updated date']}
                            onApplySorting={onApplySorting}
                        />
                        <FilteringComponent
                            disabled={disabled}
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
                {controls}
            </Col>
        </Row>
    );
}
