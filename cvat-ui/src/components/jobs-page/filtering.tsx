// Copyright (C) 2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React, { useState, useEffect } from 'react';
import 'react-awesome-query-builder/lib/css/styles.css';
import AntdConfig from 'react-awesome-query-builder/lib/config/antd';
import {
    Builder, Config, ImmutableTree, Query, Utils as QbUtils,
} from 'react-awesome-query-builder';
import {
    DownOutlined, FilterFilled, FilterOutlined,
} from '@ant-design/icons';
import Dropdown from 'antd/lib/dropdown';
import Space from 'antd/lib/space';
import Button from 'antd/lib/button';
import { useSelector } from 'react-redux';

import { CombinedState } from 'reducers/interfaces';
import Checkbox, { CheckboxChangeEvent } from 'antd/lib/checkbox/Checkbox';
import Menu from 'antd/lib/menu';

interface ResourceFilterProps {
    predefinedVisible: boolean;
    recentVisible: boolean;
    builderVisible: boolean;
    onPredefinedVisibleChange(visible: boolean): void;
    onBuilderVisibleChange(visible: boolean): void;
    onRecentVisibleChange(visible: boolean): void;
    onApplyFilter(filter: string | null): void;
}

export default function ResourceFilterHOC(
    filtrationCfg: Partial<Config>,
    localStorageRecentKeyword: string,
    localStorageRecentCapacity: number,
    predefinedFilterValues: Record<string, string>,
    defaultEnabledFilters: string[],
): React.FunctionComponent<ResourceFilterProps> {
    const config: Config = { ...AntdConfig, ...filtrationCfg };
    const defaultTree = QbUtils.checkTree(
        QbUtils.loadTree({ id: QbUtils.uuid(), type: 'group' }), config,
    ) as ImmutableTree;

    function keepFilterInLocalStorage(filter: string): void {
        if (typeof filter !== 'string') {
            return;
        }

        let savedItems: string[] = [];
        try {
            savedItems = JSON.parse(localStorage.getItem(localStorageRecentKeyword) || '[]');
            if (!Array.isArray(savedItems) || savedItems.some((item: any) => typeof item !== 'string')) {
                throw new Error('Wrong filters value stored');
            }
        } catch (_: any) {
            // nothing to do
        }
        savedItems.splice(0, 0, filter);
        savedItems = Array.from(new Set(savedItems)).slice(0, localStorageRecentCapacity);
        localStorage.setItem(localStorageRecentKeyword, JSON.stringify(savedItems));
    }

    function receiveRecentFilters(): Record<string, string> {
        let recentFilters: string[] = [];
        try {
            recentFilters = JSON.parse(localStorage.getItem(localStorageRecentKeyword) || '[]');
            if (!Array.isArray(recentFilters) || recentFilters.some((item: any) => typeof item !== 'string')) {
                throw new Error('Wrong filters value stored');
            }
        } catch (_: any) {
            // nothing to do
        }

        return recentFilters
            .reduce((acc: Record<string, string>, val: string) => ({ ...acc, [val]: val }), {});
    }

    const defaultAppliedFilter: {
        predefined: string[] | null;
        recent: string | null;
        built: string | null;
    } = {
        predefined: null,
        recent: null,
        built: null,
    };

    function ResourceFilterComponent(props: ResourceFilterProps): JSX.Element {
        const {
            predefinedVisible, builderVisible, recentVisible,
            onPredefinedVisibleChange, onBuilderVisibleChange, onRecentVisibleChange, onApplyFilter,
        } = props;

        const user = useSelector((state: CombinedState) => state.auth.user);
        const [isMounted, setIsMounted] = useState<boolean>(false);
        const [recentFilters, setRecentFilters] = useState<Record<string, string>>({});
        const [predefinedFilters, setPredefinedFilters] = useState<Record<string, string>>({});
        const [appliedFilter, setAppliedFilter] = useState<typeof defaultAppliedFilter>(defaultAppliedFilter);
        const [state, setState] = useState<ImmutableTree>(defaultTree);

        useEffect(() => {
            setRecentFilters(receiveRecentFilters());
            setIsMounted(true);
        }, []);

        useEffect(() => {
            if (user) {
                const result: Record<string, string> = {};
                for (const key of Object.keys(predefinedFilterValues)) {
                    result[key] = predefinedFilterValues[key].replace('<username>', `${user.username}`);
                }

                setPredefinedFilters(result);
                setAppliedFilter({
                    ...appliedFilter,
                    predefined: defaultEnabledFilters
                        .filter((filterKey: string) => filterKey in result)
                        .map((filterKey: string) => result[filterKey]),
                });
            }
        }, [user]);

        useEffect(() => {
            function unite(filters: string[]): string {
                if (filters.length > 1) {
                    return JSON.stringify({
                        and: filters.map((filter: string): JSON => JSON.parse(filter)),
                    });
                }

                return filters[0];
            }

            function isValidTree(tree: ImmutableTree): boolean {
                return (QbUtils.queryString(tree, config) || '').trim().length > 0 && QbUtils.isValidTree(tree);
            }

            if (!isMounted) {
                // do not request jobs before until on mount hook is done
                return;
            }

            if (appliedFilter.predefined?.length) {
                onApplyFilter(unite(appliedFilter.predefined));
            } else if (appliedFilter.recent) {
                onApplyFilter(appliedFilter.recent);
                const tree = QbUtils.loadFromJsonLogic(JSON.parse(appliedFilter.recent), config);
                if (isValidTree(tree)) {
                    setState(tree);
                }
            } else if (appliedFilter.built) {
                onApplyFilter(appliedFilter.built);
            } else {
                onApplyFilter(null);
                setState(defaultTree);
            }
        }, [appliedFilter]);

        const renderBuilder = (builderProps: any): JSX.Element => (
            <div className='query-builder-container'>
                <div className='query-builder qb-lite'>
                    <Builder {...builderProps} />
                </div>
            </div>
        );

        return (
            <div className='cvat-jobs-page-filters'>
                <Dropdown
                    destroyPopupOnHide
                    visible={predefinedVisible}
                    placement='bottomLeft'
                    overlay={(
                        <div className='cvat-jobs-page-predefined-filters-list'>
                            {Object.keys(predefinedFilters).map((key: string): JSX.Element => (
                                <Checkbox
                                    checked={appliedFilter.predefined?.includes(predefinedFilters[key])}
                                    onChange={(event: CheckboxChangeEvent) => {
                                        let updatedValue: string[] | null = appliedFilter.predefined || [];
                                        if (event.target.checked) {
                                            updatedValue.push(predefinedFilters[key]);
                                        } else {
                                            updatedValue = updatedValue
                                                .filter((appliedValue: string) => (
                                                    appliedValue !== predefinedFilters[key]
                                                ));
                                        }

                                        if (!updatedValue.length) {
                                            updatedValue = null;
                                        }

                                        setAppliedFilter({
                                            ...defaultAppliedFilter,
                                            predefined: updatedValue,
                                        });
                                    }}
                                    key={key}
                                >
                                    {key}
                                </Checkbox>
                            )) }
                        </div>
                    )}
                >
                    <Button type='default' onClick={() => onPredefinedVisibleChange(!predefinedVisible)}>
                        Quick filters
                        { appliedFilter.predefined ?
                            <FilterFilled /> :
                            <FilterOutlined />}
                    </Button>
                </Dropdown>
                <Dropdown
                    placement='bottomRight'
                    visible={builderVisible}
                    destroyPopupOnHide
                    overlay={(
                        <div className='cvat-jobs-page-filters-builder'>
                            { Object.keys(recentFilters).length ? (
                                <Dropdown
                                    placement='bottomRight'
                                    visible={recentVisible}
                                    destroyPopupOnHide
                                    overlay={(
                                        <div className='cvat-jobs-page-recent-filters-list'>
                                            <Menu selectable={false}>
                                                {Object.keys(recentFilters).map((key: string): JSX.Element | null => {
                                                    const tree = QbUtils.loadFromJsonLogic(JSON.parse(key), config);

                                                    if (!tree) {
                                                        return null;
                                                    }

                                                    return (
                                                        <Menu.Item
                                                            key={key}
                                                            onClick={() => {
                                                                if (appliedFilter.recent === key) {
                                                                    setAppliedFilter(defaultAppliedFilter);
                                                                } else {
                                                                    setAppliedFilter({
                                                                        ...defaultAppliedFilter,
                                                                        recent: key,
                                                                    });
                                                                }
                                                            }}
                                                        >
                                                            {QbUtils.queryString(tree, config)}
                                                        </Menu.Item>
                                                    );
                                                })}
                                            </Menu>
                                        </div>
                                    )}
                                >
                                    <Button
                                        size='small'
                                        type='text'
                                        onClick={
                                            () => onRecentVisibleChange(!recentVisible)
                                        }
                                    >
                                        Recent
                                        <DownOutlined />
                                    </Button>
                                </Dropdown>
                            ) : null}

                            <Query
                                {...config}
                                onChange={(tree: ImmutableTree) => {
                                    setState(tree);
                                }}
                                value={state}
                                renderBuilder={renderBuilder}
                            />
                            <Space className='cvat-jobs-page-filters-space'>
                                <Button
                                    disabled={!QbUtils.queryString(state, config)}
                                    size='small'
                                    onClick={() => {
                                        setState(defaultTree);
                                        setAppliedFilter({
                                            ...appliedFilter,
                                            recent: null,
                                            built: null,
                                        });
                                    }}
                                >
                                    Reset
                                </Button>
                                <Button
                                    size='small'
                                    type='primary'
                                    onClick={() => {
                                        const filter = QbUtils.jsonLogicFormat(state, config).logic;
                                        const stringified = JSON.stringify(filter);
                                        keepFilterInLocalStorage(stringified);
                                        setRecentFilters(receiveRecentFilters());
                                        onBuilderVisibleChange(false);
                                        setAppliedFilter({
                                            predefined: null,
                                            recent: null,
                                            built: stringified,
                                        });
                                    }}
                                >
                                    Apply
                                </Button>
                            </Space>
                        </div>
                    )}
                >
                    <Button type='default' onClick={() => onBuilderVisibleChange(!builderVisible)}>
                        Filter
                        { appliedFilter.built || appliedFilter.recent ?
                            <FilterFilled /> :
                            <FilterOutlined />}
                    </Button>
                </Dropdown>
                <Button
                    disabled={!(appliedFilter.built || appliedFilter.predefined || appliedFilter.recent)}
                    size='small'
                    type='link'
                    onClick={() => { setAppliedFilter({ ...defaultAppliedFilter }); }}
                >
                    Clear filters
                </Button>
            </div>
        );
    }

    return React.memo(ResourceFilterComponent);
}
