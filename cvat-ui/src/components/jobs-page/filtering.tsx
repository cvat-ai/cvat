// Copyright (C) 2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React, { useState, useEffect } from 'react';
import {
    Builder, Config, ImmutableTree, Query, Utils as QbUtils,
} from 'react-awesome-query-builder';
import AntdConfig from 'react-awesome-query-builder/lib/config/antd';

import 'react-awesome-query-builder/lib/css/styles.css';
import {
    CloseOutlined, DownOutlined, FilterFilled, FilterOutlined,
} from '@ant-design/icons';
import Dropdown from 'antd/lib/dropdown';
import Space from 'antd/lib/space';
import Button from 'antd/lib/button';
import { useSelector } from 'react-redux';
import { CombinedState } from 'reducers/interfaces';
import Checkbox, { CheckboxChangeEvent } from 'antd/lib/checkbox/Checkbox';
import getCore from 'cvat-core-wrapper';

const core = getCore();

const LOCAL_STORAGE_FILTERING_KEYWORD = 'jobsPageRecentFilter';
const config: Config = {
    ...AntdConfig,
    fields: {
        state: {
            label: 'State',
            type: 'select',
            operators: ['select_any_in', 'select_equals'], // ['select_equals', 'select_not_equals', 'select_any_in', 'select_not_any_in']
            valueSources: ['value'],
            fieldSettings: {
                listValues: [
                    { value: 'new', title: 'new' },
                    { value: 'in progress', title: 'in progress' },
                    { value: 'rejected', title: 'rejected' },
                    { value: 'completed', title: 'completed' },
                ],
            },
        },
        stage: {
            label: 'Stage',
            type: 'select',
            operators: ['select_any_in', 'select_equals'],
            valueSources: ['value'],
            fieldSettings: {
                listValues: [
                    { value: 'annotation', title: 'annotation' },
                    { value: 'validation', title: 'validation' },
                    { value: 'acceptance', title: 'acceptance' },
                ],
            },
        },
        dimension: {
            label: 'Dimension',
            type: 'select',
            operators: ['select_equals'],
            valueSources: ['value'],
            fieldSettings: {
                listValues: [
                    { value: '2d', title: '2D' },
                    { value: '3d', title: '3D' },
                ],
            },
        },
        assignee: {
            label: 'Assignee',
            type: 'select',
            valueSources: ['value'],
            fieldSettings: {
                useAsyncSearch: true,
                forceAsyncSearch: true,
                // async fetch does not work for now in this library for AntdConfig
                // but that issue was solved, see https://github.com/ukrbublik/react-awesome-query-builder/issues/616
                // waiting for a new release, alternative is to use material design, but it is not the best option too
                asyncFetch: async (search: string | null) => {
                    const users = await core.users.get({
                        limit: 10,
                        is_active: true,
                        ...(search ? { search } : {}),
                    });

                    return {
                        values: users.map((user: any) => ({
                            value: user.username, title: user.username,
                        })),
                        hasMore: false,
                    };
                },
            },
        },
        updated_date: {
            label: 'Last updated',
            type: 'datetime',
            operators: ['between', 'greater', 'greater_or_equal', 'less', 'less_or_equal'],
        },
        id: {
            label: 'ID',
            type: 'number',
            operators: ['equal', 'between', 'greater', 'greater_or_equal', 'less', 'less_or_equal'],
            fieldSettings: { min: 0 },
            valueSources: ['value'],
        },
        task_id: {
            label: 'Task ID',
            type: 'number',
            operators: ['equal', 'between', 'greater', 'greater_or_equal', 'less', 'less_or_equal'],
            fieldSettings: { min: 0 },
            valueSources: ['value'],
        },
        project_id: {
            label: 'Project ID',
            type: 'number',
            operators: ['equal', 'between', 'greater', 'greater_or_equal', 'less', 'less_or_equal'],
            fieldSettings: { min: 0 },
            valueSources: ['value'],
        },
        task_name: {
            label: 'Task name',
            type: 'text',
            valueSources: ['value'],
            operators: ['like'],
        },
        project_name: {
            label: 'Project name',
            type: 'text',
            valueSources: ['value'],
            operators: ['like'],
        },
    },
};

const defaultTree = QbUtils.checkTree(
    QbUtils.loadTree({ id: QbUtils.uuid(), type: 'group' }),
    config as Config,
) as ImmutableTree;

function keepFilterInLocalStorage(filter: string): void {
    if (typeof filter !== 'string') {
        return;
    }

    let savedItems: string[] = [];
    try {
        savedItems = JSON.parse(localStorage.getItem(LOCAL_STORAGE_FILTERING_KEYWORD) || '[]');
        if (!Array.isArray(savedItems) || savedItems.some((item: any) => typeof item !== 'string')) {
            throw new Error('Wrong filters value stored');
        }
    } catch (_: any) {
        // nothing to do
    }
    savedItems.splice(0, 0, filter);
    savedItems = Array.from(new Set(savedItems)).slice(0, 10);
    localStorage.setItem(LOCAL_STORAGE_FILTERING_KEYWORD, JSON.stringify(savedItems));
}

function receiveRecentFilters(): Record<string, string> {
    let recentFilters: string[] = [];
    try {
        recentFilters = JSON.parse(localStorage.getItem(LOCAL_STORAGE_FILTERING_KEYWORD) || '[]');
        if (!Array.isArray(recentFilters) || recentFilters.some((item: any) => typeof item !== 'string')) {
            throw new Error('Wrong filters value stored');
        }
    } catch (_: any) {
        // nothing to do
    }

    return recentFilters
        .reduce((acc: Record<string, string>, val: string) => ({ ...acc, [val]: val }), {});
}

function receivePredefinedFilters(username: number): Record<string, string> {
    return {
        'Assigned to you': '{"and":[{"==":[{"var":"assignee"},"username"]}]}'.replace('username', `${username}`),
        'Not completed': '{"!":{"or":[{"==":[{"var":"state"},"completed"]},{"==":[{"var":"stage"},"acceptance"]}]}}',
    };
}

const defaultAppliedFilter: {
    predefined: string[] | null;
    recent: string[] | null;
    built: string | null;
} = {
    predefined: null,
    recent: null,
    built: null,
};

const defaultVisibility: {
    predefined: boolean;
    recent: boolean;
    built: boolean;
} = {
    predefined: false,
    recent: false,
    built: false,
};

interface Props {
    onApplyFilter(filter: string | null): void;
}

function FiltersModalComponent(props: Props): JSX.Element {
    const { onApplyFilter } = props;
    const user = useSelector((state: CombinedState) => state.auth.user);

    const [isMounted, setIsMounted] = useState<boolean>(false);
    const [recentFilters, setRecentFilters] = useState<Record<string, string>>({});
    const [predefinedFilters, setPredefinedFilters] = useState<Record<string, string>>({});
    const [appliedFilter, setAppliedFilter] = useState<typeof defaultAppliedFilter>(defaultAppliedFilter);
    const [visibilitySetup, setVisibilitySetup] = useState<typeof defaultVisibility>(defaultVisibility);
    const [state, setState] = useState<ImmutableTree>(defaultTree);

    useEffect(() => {
        setRecentFilters(receiveRecentFilters());
        setIsMounted(true);
        setAppliedFilter({
            ...appliedFilter,
            predefined: [receivePredefinedFilters(0)['Not completed']],
        });
    }, []);

    useEffect(() => {
        if (user) {
            setPredefinedFilters(receivePredefinedFilters(user.username));
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
        } else if (appliedFilter.recent?.length) {
            onApplyFilter(unite(appliedFilter.recent));
            // todo: change to built
            const tree = QbUtils.loadFromJsonLogic(JSON.parse(unite(appliedFilter.recent)), config);
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

    // TODO: users list from the server
    // TODO: add sorting

    const renderBuilder = (builderProps: any): JSX.Element => (
        <div className='query-builder-container'>
            <div className='query-builder qb-lite'>
                <Builder {...builderProps} />
            </div>
        </div>
    );

    const closeButton = (onClick: () => void): JSX.Element => (
        <Button
            size='small'
            onClick={onClick}
        >
            Close
        </Button>
    );

    const closeButtonWithinSpace = (onClick: () => void): JSX.Element => (
        <Space className='cvat-jobs-page-filters-space'>
            { closeButton(onClick) }
        </Space>
    );

    function renderDropdownList(
        listKey: 'predefined' | 'recent',
        listContent: Record<string, string>,
    ): JSX.Element[] {
        return Object.keys(listContent).map((key: string): JSX.Element => (
            <Checkbox
                checked={appliedFilter[listKey]?.includes(listContent[key])}
                onChange={(event: CheckboxChangeEvent) => {
                    let updatedValue: string[] | null = appliedFilter[listKey] || [];
                    if (event.target.checked) {
                        updatedValue.push(listContent[key]);
                    } else {
                        updatedValue = updatedValue
                            .filter((appliedValue: string) => appliedValue !== listContent[key]);
                    }

                    if (!updatedValue.length) {
                        updatedValue = null;
                    }

                    setAppliedFilter({
                        ...defaultAppliedFilter,
                        [listKey]: updatedValue,
                    });
                }}
                key={key}
            >
                {key}
            </Checkbox>
        ));
    }

    return (
        <div className='cvat-jobs-page-filters'>
            <Dropdown
                trigger={['click']}
                destroyPopupOnHide
                visible={visibilitySetup.predefined}
                placement='bottomCenter'
                overlay={(
                    <div className='cvat-jobs-page-predefined-filters-list'>
                        {renderDropdownList('predefined', predefinedFilters)}
                        {closeButtonWithinSpace(() => setVisibilitySetup(defaultVisibility))}
                    </div>
                )}
            >
                <Button type='default' onClick={() => setVisibilitySetup({ ...defaultVisibility, predefined: true })}>
                    Quick filters
                    { appliedFilter.predefined ?
                        <FilterFilled /> :
                        <FilterOutlined />}
                </Button>
            </Dropdown>
            <Dropdown
                trigger={['click']}
                placement='bottomRight'
                visible={visibilitySetup.built}
                destroyPopupOnHide
                overlay={(
                    <div className='cvat-jobs-page-filters-builder'>
                        { Object.keys(recentFilters).length ? (
                            <Dropdown
                                trigger={['click']}
                                placement='bottomLeft'
                                visible={visibilitySetup.recent}
                                destroyPopupOnHide
                                overlay={(
                                    <div className='cvat-jobs-page-recent-filters-list'>
                                        {renderDropdownList('recent', recentFilters)}
                                        {closeButtonWithinSpace(
                                            () => setVisibilitySetup({ ...defaultVisibility, built: true }),
                                        )}
                                    </div>
                                )}
                            >
                                <Button
                                    size='small'
                                    type='text'
                                    onClick={() => setVisibilitySetup({ built: true, recent: true, predefined: false })}
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
                                size='small'
                                type='primary'
                                onClick={() => {
                                    const filter = QbUtils.jsonLogicFormat(state, config).logic;
                                    const stringified = JSON.stringify(filter);
                                    keepFilterInLocalStorage(stringified);
                                    setRecentFilters(receiveRecentFilters());
                                    setVisibilitySetup(defaultVisibility);
                                    setAppliedFilter({
                                        predefined: null,
                                        recent: null,
                                        built: stringified,
                                    });
                                }}
                            >
                                Apply
                            </Button>
                            { closeButton(() => setVisibilitySetup(defaultVisibility)) }
                        </Space>
                    </div>
                )}
            >
                <Button type='default' onClick={() => setVisibilitySetup({ ...defaultVisibility, built: true })}>
                    Filter
                    { appliedFilter.built || appliedFilter.recent ?
                        <FilterFilled /> :
                        <FilterOutlined />}
                </Button>
            </Dropdown>
            { (appliedFilter.built || appliedFilter.predefined || appliedFilter.recent) ? (
                <CloseOutlined onClick={() => { setAppliedFilter({ ...defaultAppliedFilter }); }} />
            ) : null}
        </div>
    );
}

export default React.memo(FiltersModalComponent);
