// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

import { DownOutlined } from '@ant-design/icons';
import { changeAnnotationsFilters, fetchAnnotationsAsync, showFilters } from 'actions/annotation-actions';
import { Dropdown, Menu } from 'antd';
import Button from 'antd/lib/button';
import Modal from 'antd/lib/modal';
import React, { useEffect, useState } from 'react';
import {
    Builder, Config, ImmutableTree, JsonLogicTree, Query, Utils as QbUtils,
} from 'react-awesome-query-builder';
import AntdConfig from 'react-awesome-query-builder/lib/config/antd';
import 'react-awesome-query-builder/lib/css/styles.css';
import { useDispatch, useSelector } from 'react-redux';
import { CombinedState } from 'reducers/interfaces';

const FILTERS_HISTORY = 'filtersHistory';

interface Props {
    visible: boolean;
}

interface StoredFilter {
    id: string;
    logic?: JsonLogicTree;
}

export default function FiltersModalComponent(props: Props): JSX.Element {
    const { visible } = props;
    const { annotations, job } = useSelector((state: CombinedState) => state.annotation);

    const jobLabels: string[] = job.labels.map((label: any) => label.name);
    const serverIds: number[] = annotations.states.map((state: any) => state.serverID);
    const clientIds: number[] = annotations.states.map((state: any) => state.clientID);
    const jobAttributes: any[] = Object.values(job.attributes).flat(Number.MAX_SAFE_INTEGER);

    const getConvertedInputType = (inputType: string): string => {
        switch (inputType) {
            case 'checkbox':
                return 'boolean';
            case 'radio':
                return 'text';
            default:
                return inputType;
        }
    };

    const getAttributesSubfields = (): Record<string, any> => {
        const subfields: Record<string, any> = {};
        jobAttributes.map((attr: any) => {
            subfields[attr.name] = {
                label: attr.name,
                type: getConvertedInputType(attr.inputType),
            };
            if (attr.inputType === 'select') {
                subfields[attr.name] = {
                    ...subfields[attr.name],
                    fieldSettings: {
                        listValues: attr.values,
                    },
                };
            }
            return null;
        });
        return subfields;
    };

    const config: Config = {
        ...AntdConfig,
        fields: {
            label: {
                label: 'Label',
                type: 'select',
                fieldSettings: {
                    listValues: jobLabels,
                },
            },
            type: {
                label: 'Type',
                type: 'select',
                fieldSettings: {
                    listValues: [
                        { value: 'shape', title: 'Shape' },
                        { value: 'track', title: 'Track' },
                        { value: 'tag', title: 'Tag' },
                    ],
                },
            },
            shape: {
                label: 'Shape',
                type: 'select',
                fieldSettings: {
                    listValues: [
                        { value: 'rectangle', title: 'Rectangle' },
                        { value: 'points', title: 'Points' },
                        { value: 'polyline', title: 'Polyline' },
                        { value: 'polygon', title: 'Polygon' },
                        { value: 'cuboids', title: 'Cuboids' },
                    ],
                },
            },
            occluded: {
                label: 'Occluded',
                type: 'boolean',
            },
            width: {
                label: 'Width',
                type: 'number',
                fieldSettings: { min: 0 },
            },
            height: {
                label: 'Height',
                type: 'number',
                fieldSettings: { min: 0 },
            },
            clientID: {
                label: 'ClientID',
                type: 'select',
                fieldSettings: {
                    listValues: clientIds,
                },
            },
            serverID: {
                label: 'ServerID',
                type: 'select',
                fieldSettings: {
                    listValues: serverIds,
                },
            },
            attr: {
                label: 'Attributes',
                type: '!struct',
                subfields: getAttributesSubfields(),
            },
        },
    };

    const initialState = {
        tree: QbUtils.checkTree(
            QbUtils.loadTree({ id: QbUtils.uuid(), type: 'group' }),
            config as Config,
        ) as ImmutableTree,
        config,
    };

    const dispatch = useDispatch();
    const [state, setState] = useState(initialState);
    const [filters, setFilters] = useState([] as StoredFilter[]);

    useEffect(() => {
        const filtersHistory = window.localStorage.getItem(FILTERS_HISTORY)?.trim() || '[]';
        try {
            setFilters(JSON.parse(filtersHistory));
        } catch (_) {
            setFilters([]);
        }
    }, []);

    useEffect(() => {
        window.localStorage.setItem(FILTERS_HISTORY, JSON.stringify(filters));
    }, [filters]);

    useEffect(() => {
        if (visible) {
            const activeFilters = annotations.filters;
            const treeFromActiveFilters = activeFilters.length ?
                QbUtils.checkTree(QbUtils.loadFromJsonLogic(activeFilters[0], config), config) :
                null;
            setState({
                tree: treeFromActiveFilters || initialState.tree,
                config,
            });
        }
    }, [visible]);

    const applyFilters = (filtersData: any[]): void => {
        dispatch(changeAnnotationsFilters(filtersData));
        dispatch(fetchAnnotationsAsync());
        dispatch(showFilters(false));
    };

    const confirmModal = (): void => {
        const currentFilter: StoredFilter = {
            id: QbUtils.uuid(),
            logic: QbUtils.jsonLogicFormat(state.tree, config).logic,
        };
        const updatedFilters = filters.filter(
            (filter) => JSON.stringify(filter.logic) !== JSON.stringify(currentFilter.logic),
        );
        setFilters([currentFilter, ...updatedFilters].slice(0, 10));
        applyFilters([QbUtils.jsonLogicFormat(state.tree, config).logic]);
    };

    const isModalConfirmable = (): boolean =>
        QbUtils.queryString(state.tree, config)?.trim().length > 0 && QbUtils.isValidTree(state.tree);

    const renderBuilder = (builderProps: any): JSX.Element => (
        <div className='query-builder-container'>
            <div className='query-builder qb-lite'>
                <Builder {...builderProps} />
            </div>
        </div>
    );

    const onChange = (tree: ImmutableTree): void => {
        setState({ tree, config });
    };

    const menu = (
        <Menu>
            {filters.map((filter: StoredFilter) => {
                const treeFromFilter = QbUtils.loadFromJsonLogic(filter.logic || {}, config);
                return (
                    <Menu.Item
                        key={filter.id}
                        onClick={() =>
                            setState({
                                tree: QbUtils.checkTree(
                                    QbUtils.loadFromJsonLogic(filter.logic || {}, config),
                                    config as Config,
                                ) as ImmutableTree,
                                config,
                            })}
                    >
                        {QbUtils.queryString(treeFromFilter, config)}
                    </Menu.Item>
                );
            })}
        </Menu>
    );

    return (
        <Modal
            className='cvat-filters-modal'
            visible={visible}
            closable={false}
            width={800}
            centered
            onCancel={() => dispatch(showFilters(false))}
            footer={[
                <Button key='clear' disabled={!annotations.filters.length} onClick={() => applyFilters([])}>
                    Clear filters
                </Button>,
                <Button key='cancel' onClick={() => dispatch(showFilters(false))}>
                    Cancel
                </Button>,
                <Button key='submit' type='primary' disabled={!isModalConfirmable()} onClick={confirmModal}>
                    Submit
                </Button>,
            ]}
        >
            <div key='used' style={{ display: filters.length ? 'inline-block' : 'none' }}>
                <Dropdown overlay={menu}>
                    <Button type='link'>
                        Recently used
                        {' '}
                        <DownOutlined />
                    </Button>
                </Dropdown>
            </div>
            <Query {...config} value={state.tree} onChange={onChange} renderBuilder={renderBuilder} />
        </Modal>
    );
}
