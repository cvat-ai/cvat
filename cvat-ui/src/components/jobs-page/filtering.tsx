// Copyright (C) 2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React, { useState, useEffect } from 'react';
import {
    Builder, Config, ImmutableTree, Query, Utils as QbUtils,
} from 'react-awesome-query-builder';
import AntdConfig from 'react-awesome-query-builder/lib/config/antd';
import 'react-awesome-query-builder/lib/css/styles.css';
import { DownOutlined, FilterOutlined } from '@ant-design/icons';
import Dropdown from 'antd/lib/dropdown';
import Space from 'antd/lib/space';
import Button from 'antd/lib/button';
import { useSelector } from 'react-redux';
import { CombinedState } from 'reducers/interfaces';
import Checkbox, { CheckboxChangeEvent } from 'antd/lib/checkbox/Checkbox';

const LOCAL_STORAGE_FILTERING_KEYWORD = 'jobsPageRecentFilters';
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
            type: 'text',
            operators: ['equal', 'is_empty', 'is_not_empty'],
            valueSources: ['value'],
        },
        last_updated: {
            label: 'Last updated',
            type: 'datetime',
            operators: ['between'],
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

function keepFilterInLocalStorage(filter: string): void {
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

function receiveRecentFilters(): string[] {
    let recentFilters: string[] = [];
    try {
        recentFilters = JSON.parse(localStorage.getItem(LOCAL_STORAGE_FILTERING_KEYWORD) || '[]');
        if (!Array.isArray(recentFilters) || recentFilters.some((item: any) => typeof item !== 'string')) {
            throw new Error('Wrong filters value stored');
        }
    } catch (_: any) {
        // nothing to do
    }

    return recentFilters;
}

function receivePredefinedFilters(username: string): Record<string, string> {
    return {
        'Assigned to you': '{"and":[{"==":[{"var":"assignee"},"username"]}]}'.replace('username', username),
        'Not completed': '{"!":{"or":[{"==":[{"var":"state"},"completed"]},{"==":[{"var":"stage"},"acceptance"]}]}}',
    };
}

interface AppliedFilter {
    predefined: string[] | null;
    recent: string[] | null;
    built: string | null;
}

interface Props {
    onApplyFilters(filters: string): void;
}

function FiltersModalComponent(props: Props): JSX.Element {
    const { onApplyFilters } = props;
    const user = useSelector((state: CombinedState) => state.auth.user);

    const [visible, setVisible] = useState<boolean>(false);
    const [recentFilters, setRecentFilters] = useState<string[]>([]);
    const [predefinedFilters, setPredefinedFilters] = useState<Record<string, string>>({});
    const [appliedFilter, setAppliedFilter] = useState<AppliedFilter>({
        predefined: null,
        recent: null,
        built: null,
    });

    useEffect(() => {
        setRecentFilters(receiveRecentFilters());
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
                    and: [filters.map((filter: string): JSON => JSON.parse(filter))],
                });
            }

            return filters[0];
        }

        if (appliedFilter.predefined?.length) {
            onApplyFilters(unite(appliedFilter.predefined));
        } else if (appliedFilter.recent?.length) {
            onApplyFilters(unite(appliedFilter.recent));
        } else if (appliedFilter.built) {
            onApplyFilters(appliedFilter.built);
        }
    }, [appliedFilter]);

    // TODO:
    // pass filters to query, to server
    // make server to handle the request with the query
    // todo: colorify applied filters

    const [state, setState] = useState<ImmutableTree>(
        QbUtils.checkTree(
            QbUtils.loadTree({ id: QbUtils.uuid(), type: 'group' }),
            config as Config,
        ) as ImmutableTree,
    );

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
                trigger={['click']}
                placement='bottomCenter'
                overlay={(): JSX.Element => (
                    <div className='cvat-jobs-page-predefined-filters-list'>
                        {Object.keys(predefinedFilters).map((key: string): JSX.Element => (
                            <Checkbox
                                checked={appliedFilter.predefined?.includes(predefinedFilters[key])}
                                onChange={(event: CheckboxChangeEvent) => {
                                    const updatedAppliedFilter: AppliedFilter = {
                                        predefined: appliedFilter.predefined || [],
                                        recent: null,
                                        built: null,
                                    };
                                    if (event.target.checked) {
                                        (updatedAppliedFilter.predefined as string[]).push(predefinedFilters[key]);
                                    } else {
                                        updatedAppliedFilter.predefined = (updatedAppliedFilter.predefined as string[])
                                            .filter((appliedValue: string) => appliedValue !== predefinedFilters[key]);
                                    }
                                    setAppliedFilter(updatedAppliedFilter);
                                }}
                                key={key}
                            >
                                {key}
                            </Checkbox>
                        ))}
                    </div>
                )}
            >
                <div>
                    <DownOutlined />
                    Predefined filters
                </div>
            </Dropdown>
            { recentFilters.length ? (
                <Dropdown
                    trigger={['click']}
                    placement='bottomCenter'
                    overlay={(): JSX.Element => (
                        <div className='cvat-jobs-page-recent-filters-list'>
                            {recentFilters.map((value: string): JSX.Element | null => {
                                try {
                                    const tree = QbUtils.loadFromJsonLogic(JSON.parse(value), config);
                                    const queryString = QbUtils.queryString(tree, config);
                                    if (!tree || !queryString) {
                                        throw new Error('Empty json logic');
                                    }

                                    return (
                                        <Checkbox
                                            checked={appliedFilter.recent?.includes(value)}
                                            onChange={(event: CheckboxChangeEvent) => {
                                                const updatedAppliedFilter: AppliedFilter = {
                                                    predefined: null,
                                                    recent: [],
                                                    built: null,
                                                };
                                                if (event.target.checked) {
                                                    (updatedAppliedFilter.recent as string[]).push(value);
                                                } else {
                                                    updatedAppliedFilter
                                                        .recent = (updatedAppliedFilter.recent as string[])
                                                            .filter((appliedValue: string) => appliedValue !== value);
                                                }
                                                setAppliedFilter(updatedAppliedFilter);
                                            }}
                                            key={queryString}
                                        >
                                            {queryString}
                                        </Checkbox>
                                    );
                                } catch (_: any) {
                                    // nothing to do
                                }

                                return null;
                            }).filter((value: JSX.Element | null) => !!value)}
                        </div>
                    )}
                >
                    <div>
                        <DownOutlined />
                        Recently used
                    </div>
                </Dropdown>
            ) : null}
            <Dropdown
                visible={visible}
                placement='bottomRight'
                overlay={(
                    <div className='cvat-jobs-page-filters-builder'>
                        <Query
                            {...config}
                            onChange={(tree: ImmutableTree) => {
                                setState(tree);
                            }}
                            value={state}
                            renderBuilder={renderBuilder}
                        />
                        <Space>
                            <Button
                                type='primary'
                                onClick={() => {
                                    const filter = QbUtils.jsonLogicFormat(state, config).logic;
                                    const stringified = JSON.stringify(filter);
                                    keepFilterInLocalStorage(stringified);
                                    setRecentFilters(receiveRecentFilters());
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
                <Button type='link' icon={<FilterOutlined />} onClick={() => setVisible(true)} />
            </Dropdown>
        </div>
    );
}

export default React.memo(FiltersModalComponent);
