// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector, shallowEqual } from 'react-redux';
import {
    Builder, Config, ImmutableTree, JsonLogicTree, Query, Utils as QbUtils, AntdConfig, AntdWidgets,
} from '@react-awesome-query-builder/antd';

import { omit } from 'lodash';
import { DownOutlined, ExportOutlined, ImportOutlined, EditOutlined } from '@ant-design/icons';
import Popover from 'antd/lib/popover';
import Menu from 'antd/lib/menu';
import Button from 'antd/lib/button';
import Modal from 'antd/lib/modal';
import Input from 'antd/lib/input';
import Space from 'antd/lib/space';
import Divider from 'antd/lib/divider';
import message from 'antd/lib/message';
import { CombinedState } from 'reducers';
import { Label } from 'cvat-core-wrapper';
import { changeAnnotationsFilters, fetchAnnotationsAsync, showFilters } from 'actions/annotation-actions';
import { toClipboard } from 'utils/to-clipboard';
import {
    createFilterExportData,
    extractFilterLogic,
    validateFilterData,
    createShareableURL,
    extractFilterFromURL,
    cleanFilterFromURL,
} from 'utils/filter-export-import';

const { FieldDropdown } = AntdWidgets;

const FILTERS_HISTORY = 'annotationFiltersHistory';
const defaultTree = QbUtils.loadTree({ type: 'group', id: QbUtils.uuid() });

interface StoredFilter {
    id: string;
    logic: JsonLogicTree;
}

const getConvertedInputType = (inputType: string): string => {
    switch (inputType) {
        case 'checkbox':
            return 'boolean';
        case 'radio':
            return 'select';
        default:
            return inputType;
    }
};

const adjustName = (name: string): string => name.replace(/\./g, '\u2219');

const getAttributesSubfields = (labels: Label[]): Record<string, any> => {
    const subfields: Record<string, any> = {};
    labels.forEach((label: any): void => {
        const adjustedLabelName = adjustName(label.name);
        subfields[adjustedLabelName] = {
            type: '!struct', // nested complex field
            label: label.name,
            subfields: {},
        };

        const labelSubfields = subfields[adjustedLabelName].subfields;
        label.attributes.forEach((attr: any): void => {
            const adjustedAttrName = adjustName(attr.name);
            labelSubfields[adjustedAttrName] = {
                label: attr.name,
                type: getConvertedInputType(attr.inputType),
            };
            if (labelSubfields[adjustedAttrName].type === 'select') {
                labelSubfields[adjustedAttrName] = {
                    ...labelSubfields[adjustedAttrName],
                    fieldSettings: {
                        listValues: attr.values,
                    },
                };
            }
        });
    });

    return subfields;
};

function FiltersModalComponent(): JSX.Element {
    const { labels, activeFilters, visible } = useSelector(
        (state: CombinedState) => ({
            labels: state.annotation.job.labels,
            activeFilters: state.annotation.annotations.filters,
            visible: state.annotation.filtersPanelVisible,
        }),
        shallowEqual,
    );
    const [config, setConfig] = useState<Config>(AntdConfig);

    const dispatch = useDispatch();
    const [immutableTree, setImmutableTree] = useState<ImmutableTree>(defaultTree);
    const [filters, setFilters] = useState([] as StoredFilter[]);
    const [showTextEditor, setShowTextEditor] = useState(false);
    const [filterTextInput, setFilterTextInput] = useState('');

    useEffect(() => {
        const initialConfig = {
            ...AntdConfig,
            fields: {
                label: {
                    label: 'Label',
                    type: 'select',
                    valueSources: ['value'] as ('value')[],
                    fieldSettings: {
                        listValues: labels.map((label: any) => ({
                            value: label.name,
                            title: label.name,
                        })),
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
                            { value: 'cuboid', title: 'Cuboid' },
                            { value: 'ellipse', title: 'Ellipse' },
                            { value: 'skeleton', title: 'Skeleton' },
                            { value: 'mask', title: 'Mask' },
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
                objectID: {
                    label: 'ObjectID',
                    type: 'number',
                    hideForCompare: true,
                    fieldSettings: { min: 0 },
                },
                serverID: {
                    label: 'ServerID',
                    type: 'number',
                    hideForCompare: true,
                    fieldSettings: { min: 0 },
                },
                attr: {
                    label: 'Attributes',
                    type: '!struct',
                    subfields: getAttributesSubfields(labels),
                    fieldSettings: {
                        treeSelectOnlyLeafs: true,
                    },
                },
            },
            settings: {
                ...AntdConfig.settings,
                renderField: (_props: any) => (
                    <FieldDropdown {...omit(_props)} customProps={omit(_props.customProps, 'showSearch')} />
                ),
                // using FieldDropdown because we cannot use antd because of antd-related bugs
                // https://github.com/ukrbublik/react-awesome-query-builder/issues/224
            },
        };

        setConfig(initialConfig);
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

    // Check for URL filter parameters on component mount and apply them automatically
    useEffect(() => {
        if (config.fields) {
            const filterLogic = extractFilterFromURL();
            
            if (filterLogic) {
                try {
                    const tree = QbUtils.loadFromJsonLogic(filterLogic, config);
                    if (tree && QbUtils.isValidTree(tree, config)) {
                        // Automatically apply the filter from URL without opening the modal
                        applyFilters([filterLogic]);
                        
                        // Remove the filter parameter from URL to prevent repeated loading
                        const newURL = cleanFilterFromURL();
                        window.history.replaceState({}, '', newURL);
                    }
                } catch (urlError) {
                    console.warn('Failed to load filter from URL:', urlError);
                }
            }
        }
    }, [config]);

    useEffect(() => {
        if (visible) {
            try {
                // Load current active filters to display in modal
                if (activeFilters.length) {
                    const tree = QbUtils.loadFromJsonLogic(activeFilters[0], config);
                    if (tree) {
                        const treeFromActiveFilters = QbUtils.checkTree(tree, config);
                        setImmutableTree(treeFromActiveFilters);
                    } else {
                        throw new Error();
                    }
                } else {
                    throw new Error();
                }
            } catch (_: any) {
                setImmutableTree(defaultTree);
            }
        }
    }, [visible, config]);

    const applyFilters = (filtersData: object[]): void => {
        dispatch(changeAnnotationsFilters(filtersData));
        dispatch(fetchAnnotationsAsync());
        dispatch(showFilters(false));
    };

    const exportCurrentFilter = (): void => {
        const currentFilter = QbUtils.jsonLogicFormat(immutableTree, config).logic;
        if (currentFilter && Object.keys(currentFilter).length > 0) {
            const humanReadable = QbUtils.queryString(immutableTree, config) || '';
            const filterData = createFilterExportData(currentFilter, humanReadable);
            toClipboard(JSON.stringify(filterData, null, 2));
            message.success('Filter exported to clipboard');
        } else {
            message.warning('No filter to export');
        }
    };

    const importFilterFromText = (): void => {
        if (!filterTextInput.trim()) {
            message.warning('Please enter filter data to import');
            return;
        }

        if (!validateFilterData(filterTextInput)) {
            message.error('Failed to parse filter data. Please check the JSON format.');
            return;
        }

        try {
            const importData = JSON.parse(filterTextInput);
            const filterLogic = extractFilterLogic(importData);

            if (filterLogic) {
                const tree = QbUtils.loadFromJsonLogic(filterLogic, config);
                if (tree) {
                    const validatedTree = QbUtils.checkTree(tree, config);
                    setImmutableTree(validatedTree);
                    setShowTextEditor(false);
                    setFilterTextInput('');
                    message.success('Filter imported successfully');
                } else {
                    message.error('Invalid filter format');
                }
            } else {
                message.error('Invalid filter format');
            }
        } catch (error) {
            message.error('Failed to parse filter data. Please check the JSON format.');
        }
    };

    const generateShareableURL = (): void => {
        const currentFilter = QbUtils.jsonLogicFormat(immutableTree, config).logic;
        if (currentFilter && Object.keys(currentFilter).length > 0) {
            try {
                const shareableURL = createShareableURL(currentFilter);
                toClipboard(shareableURL);
                message.success('Shareable URL copied to clipboard');
            } catch (error) {
                message.error('Failed to generate shareable URL');
            }
        } else {
            message.warning('No filter to share');
        }
    };

    const confirmModal = (): void => {
        const currentFilter: StoredFilter = {
            id: QbUtils.uuid(),
            logic: QbUtils.jsonLogicFormat(immutableTree, config).logic || {},
        };
        const updatedFilters = filters.filter(
            (filter) => JSON.stringify(filter.logic) !== JSON.stringify(currentFilter.logic),
        );
        setFilters([currentFilter, ...updatedFilters].slice(0, 10));
        applyFilters([currentFilter.logic]);
    };

    const isModalConfirmable = (): boolean => (
        (QbUtils.queryString(immutableTree, config) || '')
            .trim().length > 0 && QbUtils.isValidTree(immutableTree, config)
    );

    const renderBuilder = (builderProps: any): JSX.Element => (
        <div className='query-builder-container'>
            <div className='query-builder'>
                <Builder {...builderProps} />
            </div>
        </div>
    );

    const onChange = (tree: ImmutableTree): void => {
        setImmutableTree(tree);
    };

    const menu = (
        <Menu>
            {filters
                .map((filter: StoredFilter) => {
                    // if a logic received from local storage does not correspond to current config
                    // which depends on label specification
                    // (it can be when history from another task with another specification or when label was removed)
                    // loadFromJsonLogic() prints a warning to console
                    // the are not ways to configure this behaviour

                    const tree = QbUtils.loadFromJsonLogic(filter.logic, config);
                    if (tree) {
                        const queryString = QbUtils.queryString(tree, config);
                        return { tree, queryString, filter };
                    }

                    return { tree, queryString: null, filter };
                })
                .filter(({ queryString }) => !!queryString)
                .map(({ filter, tree, queryString }) => (
                    <Menu.Item key={filter.id} onClick={() => setImmutableTree(tree as ImmutableTree)}>
                        {queryString}
                    </Menu.Item>
                ))}
        </Menu>
    );

    return (
        <Modal
            className={visible ? 'cvat-filters-modal cvat-filters-modal-visible' : 'cvat-filters-modal'}
            open={visible}
            closable={false}
            width={800}
            destroyOnClose
            centered
            onCancel={() => dispatch(showFilters(false))}
            footer={[
                <Space key='left-actions' style={{ flex: 1, justifyContent: 'flex-start' }}>
                    <Button
                        key='export'
                        icon={<ExportOutlined />}
                        disabled={!isModalConfirmable()}
                        onClick={exportCurrentFilter}
                        className='cvat-filters-modal-export-button'
                        title='Export filter to clipboard'
                    >
                        Export
                    </Button>
                    <Button
                        key='share-url'
                        disabled={!isModalConfirmable()}
                        onClick={generateShareableURL}
                        className='cvat-filters-modal-share-button'
                        title='Generate shareable URL'
                    >
                        Share URL
                    </Button>
                    <Button
                        key='import'
                        icon={<ImportOutlined />}
                        onClick={() => setShowTextEditor(!showTextEditor)}
                        className='cvat-filters-modal-import-button'
                        title='Import filter from text'
                    >
                        Import
                    </Button>
                </Space>,
                <Button
                    key='clear'
                    disabled={!activeFilters.length}
                    onClick={() => applyFilters([])}
                    className='cvat-filters-modal-clear-button'
                >
                    Clear filters
                </Button>,
                <Button
                    key='cancel'
                    onClick={() => dispatch(showFilters(false))}
                    className='cvat-filters-modal-cancel-button'
                >
                    Cancel
                </Button>,
                <Button
                    key='submit'
                    type='primary'
                    disabled={!isModalConfirmable()}
                    onClick={confirmModal}
                    className='cvat-filters-modal-submit-button'
                >
                    Submit
                </Button>,
            ]}
        >
            <div
                key='used'
                className='cvat-recently-used-filters-wrapper'
                style={{ display: filters.length ? 'inline-block' : 'none' }}
            >
                <Popover
                    destroyTooltipOnHide
                    trigger='click'
                    placement='top'
                    overlayInnerStyle={{ padding: 0 }}
                    overlayClassName='cvat-recently-used-filters-dropdown'
                    content={menu}
                >
                    <Button
                        type='text'
                        className='cvat-filters-modal-recently-used-button'
                    >
                        Recently used
                        {' '}
                        <DownOutlined />
                    </Button>
                </Popover>
            </div>
            
            {showTextEditor && (
                <>
                    <Divider>Import Filter</Divider>
                    <div className='cvat-filters-text-editor'>
                        <Input.TextArea
                            value={filterTextInput}
                            onChange={(e) => setFilterTextInput(e.target.value)}
                            placeholder='Paste filter JSON here...'
                            autoSize={{ minRows: 4, maxRows: 8 }}
                            className='cvat-filters-text-input'
                        />
                        <div style={{ marginTop: 8, textAlign: 'right' }}>
                            <Space>
                                <Button 
                                    onClick={() => {
                                        setShowTextEditor(false);
                                        setFilterTextInput('');
                                    }}
                                >
                                    Cancel
                                </Button>
                                <Button 
                                    type='primary' 
                                    onClick={importFilterFromText}
                                    disabled={!filterTextInput.trim()}
                                >
                                    Apply Filter
                                </Button>
                            </Space>
                        </div>
                    </div>
                </>
            )}
            
            { !!config.fields && (
                <Query
                    {...config}
                    value={immutableTree as ImmutableTree}
                    onChange={onChange}
                    renderBuilder={renderBuilder}
                />
            )}
        </Modal>
    );
}

export default React.memo(FiltersModalComponent);
