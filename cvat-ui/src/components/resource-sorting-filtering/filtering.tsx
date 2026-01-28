// Copyright (C) 2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useState, useEffect } from 'react';
import {
    Builder, Config, AntdConfig, ImmutableTree, Query, Utils as QbUtils,
} from '@react-awesome-query-builder/antd';
import '@modules/@react-awesome-query-builder/antd/css/styles.css';
import {
    DownOutlined, FilterFilled, FilterOutlined,
} from '@ant-design/icons';
import Popover from 'antd/lib/popover';
import Space from 'antd/lib/space';
import Button from 'antd/lib/button';
import Checkbox, { CheckboxChangeEvent } from 'antd/lib/checkbox/Checkbox';
import Menu from 'antd/lib/menu';
import { useSelector } from 'react-redux';
import { CombinedState } from 'reducers';
import { User } from 'cvat-core-wrapper';

interface ResourceFilterProps {
    predefinedVisible?: boolean;
    recentVisible: boolean;
    builderVisible: boolean;
    value: string | null;
    disabled?: boolean;
    onPredefinedVisibleChange?: (visible: boolean) => void;
    onBuilderVisibleChange(visible: boolean): void;
    onRecentVisibleChange(visible: boolean): void;
    onApplyFilter(filter: string | null): void;
}

export default function ResourceFilterHOC(
    filtrationCfg: Partial<Config>,
    localStorageRecentKeyword: string,
    localStorageRecentCapacity: number,
    predefinedFilterValues?: Record<string, string>,
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

    function isValidTree(tree: ImmutableTree): boolean {
        return (QbUtils.queryString(tree, config) || '').trim().length > 0 && QbUtils.isValidTree(tree, config);
    }

    function unite(filters: string[]): string {
        if (filters.length > 1) {
            return JSON.stringify({
                and: filters.map((filter: string): JSON => JSON.parse(filter)),
            });
        }

        return filters[0];
    }

    function getPredefinedFilters(user: User): Record<string, string> | null {
        let result: Record <string, string> | null = null;
        if (user && predefinedFilterValues) {
            result = {};
            for (const key of Object.keys(predefinedFilterValues)) {
                result[key] = predefinedFilterValues[key].replace('<username>', `${user.username}`);
            }
        }

        return result;
    }

    function ResourceFilterComponent(props: ResourceFilterProps): JSX.Element {
        const {
            predefinedVisible, builderVisible, recentVisible, value,
            onPredefinedVisibleChange, onBuilderVisibleChange, onRecentVisibleChange, onApplyFilter,
            disabled,
        } = props;

        const user = useSelector((state: CombinedState) => state.auth.user);
        const [isMounted, setIsMounted] = useState<boolean>(false);
        const [recentFilters, setRecentFilters] = useState<Record<string, string>>({});
        const [appliedFilter, setAppliedFilter] = useState(defaultAppliedFilter);
        const [state, setState] = useState<ImmutableTree>(defaultTree);

        useEffect(() => {
            setRecentFilters(receiveRecentFilters());
            setIsMounted(true);

            try {
                if (value) {
                    const tree = QbUtils.loadFromJsonLogic(JSON.parse(value), config);
                    if (tree && isValidTree(tree)) {
                        setAppliedFilter({
                            ...appliedFilter,
                            built: JSON.stringify(QbUtils.jsonLogicFormat(tree, config).logic),
                        });
                        setState(tree);
                    }
                }
            } catch (_: any) {
                // nothing to do
            }
        }, []);

        useEffect(() => {
            const listener = (event: MouseEvent): void => {
                const path: HTMLElement[] = event.composedPath()
                    .filter((el: EventTarget) => el instanceof HTMLElement) as HTMLElement[];
                if (path.some((el: HTMLElement) => el.id === 'root') && !path.some((el: HTMLElement) => el.classList.contains('ant-btn'))) {
                    if (builderVisible) {
                        onBuilderVisibleChange(false);
                    }

                    if (predefinedVisible) {
                        onRecentVisibleChange(false);
                    }
                }
            };

            window.addEventListener('click', listener);
            return () => window.removeEventListener('click', listener);
        }, [builderVisible, predefinedVisible]);

        useEffect(() => {
            if (!isMounted) {
                // do not request resources until on mount hook is done
                return;
            }

            if (appliedFilter.predefined?.length) {
                onApplyFilter(unite(appliedFilter.predefined));
            } else if (appliedFilter.recent) {
                onApplyFilter(appliedFilter.recent);
                const tree = QbUtils.loadFromJsonLogic(JSON.parse(appliedFilter.recent), config);
                if (tree && isValidTree(tree)) {
                    setState(tree);
                }
            } else if (appliedFilter.built) {
                if (value !== appliedFilter.built) {
                    onApplyFilter(appliedFilter.built);
                }
            } else {
                onApplyFilter(null);
                setState(defaultTree);
            }
        }, [appliedFilter]);

        const renderBuilder = (builderProps: any): JSX.Element => (
            <div className='query-builder-container'>
                <div className='query-builder'>
                    <Builder {...builderProps} />
                </div>
            </div>
        );

        const predefinedFilters = getPredefinedFilters(user);
        return (
            <div className='cvat-resource-page-filters'>
                {
                    predefinedFilters && onPredefinedVisibleChange ? (
                        <Popover
                            destroyTooltipOnHide
                            open={predefinedVisible}
                            overlayInnerStyle={{ padding: 0 }}
                            placement='bottomLeft'
                            content={(
                                <div className='cvat-resource-page-predefined-filters-list'>
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
                            <Button
                                className='cvat-quick-filters-button'
                                type='default'
                                onClick={() => onPredefinedVisibleChange(!predefinedVisible)}
                            >
                                Quick filters
                                { appliedFilter.predefined ?
                                    <FilterFilled /> :
                                    <FilterOutlined />}
                            </Button>
                        </Popover>
                    ) : null
                }
                <Popover
                    placement='bottomRight'
                    open={builderVisible}
                    destroyTooltipOnHide
                    overlayInnerStyle={{ padding: 0 }}
                    content={(
                        <div className='cvat-resource-page-filters-builder'>
                            { Object.keys(recentFilters).length ? (
                                <Popover
                                    placement='bottomRight'
                                    open={recentVisible}
                                    destroyTooltipOnHide
                                    overlayInnerStyle={{ padding: 0 }}
                                    content={(
                                        <div className='cvat-resource-page-recent-filters-list'>
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
                                        className='cvat-recent-filters-button'
                                        size='small'
                                        type='text'
                                        onClick={
                                            () => onRecentVisibleChange(!recentVisible)
                                        }
                                    >
                                        Recent
                                        <DownOutlined />
                                    </Button>
                                </Popover>
                            ) : null}

                            <Query
                                {...config}
                                onChange={(tree: ImmutableTree) => {
                                    setState(tree);
                                }}
                                value={state}
                                renderBuilder={renderBuilder}
                            />
                            <Space className='cvat-resource-page-filters-space'>
                                <Button
                                    className='cvat-reset-filters-button'
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
                                    className='cvat-apply-filters-button'
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
                    <Button
                        disabled={disabled}
                        className='cvat-switch-filters-constructor-button'
                        type='default'
                        onClick={() => onBuilderVisibleChange(!builderVisible)}
                    >
                        Filter
                        { appliedFilter.built || appliedFilter.recent ?
                            <FilterFilled /> :
                            <FilterOutlined />}
                    </Button>
                </Popover>
                <Button
                    className='cvat-clear-filters-button'
                    disabled={!(appliedFilter.built || appliedFilter.predefined || appliedFilter.recent) || disabled}
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
