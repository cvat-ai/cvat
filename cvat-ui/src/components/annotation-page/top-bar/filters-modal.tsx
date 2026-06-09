// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { shallowEqual } from 'utils/redux';
import {
    Builder,
    Config,
    ImmutableTree,
    JsonLogicTree,
    Query,
    Utils as QbUtils,
    AntdConfig,
    AntdWidgets,
} from '@react-awesome-query-builder/antd';

import { DownOutlined } from '@ant-design/icons';
import Popover from 'antd/lib/popover';
import Menu from 'antd/lib/menu';
import Button from 'antd/lib/button';
import Modal from 'antd/lib/modal';
import Typography from 'antd/lib/typography';
import { CombinedState } from 'reducers';
import { Label } from 'cvat-core-wrapper';
import { changeAnnotationsFilters, fetchAnnotationsAsync, showFilters } from 'actions/annotation-actions';

const { FieldDropdown } = AntdWidgets;

const FILTERS_HISTORY = 'annotationFiltersHistory';
const defaultTree = QbUtils.loadTree({ type: 'group', id: QbUtils.uuid() });

interface StoredFilter {
    id: string;
    logic: JsonLogicTree;
    keypointLogic?: JsonLogicTree;
}

const isEmptyLogic = (logic: object | undefined): boolean => !logic || !Object.keys(logic).length;

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

const buildAttributeSubfield = (
    displayLabel: string,
    attributes: any[],
): Record<string, any> | null => {
    if (!attributes.length) {
        return null;
    }

    const attributeSubfield: Record<string, any> = {
        type: '!struct',
        label: displayLabel,
        subfields: {},
    };

    const attrSubfields = attributeSubfield.subfields;
    attributes.forEach((attr: any): void => {
        const adjustedAttrName = adjustName(attr.name);
        attrSubfields[adjustedAttrName] = {
            label: attr.name,
            type: getConvertedInputType(attr.inputType),
        };
        if (attrSubfields[adjustedAttrName].type === 'select') {
            attrSubfields[adjustedAttrName] = {
                ...attrSubfields[adjustedAttrName],
                fieldSettings: {
                    listValues: attr.values,
                },
            };
        }
    });

    return attributeSubfield;
};

const getAttributesSubfields = (labels: Label[]): Record<string, any> => {
    const subfields: Record<string, any> = {};
    labels.forEach((label: any): void => {
        const attributeSubfield = buildAttributeSubfield(label.name, label.attributes);
        if (attributeSubfield) {
            subfields[adjustName(label.name)] = attributeSubfield;
        }
    });

    return subfields;
};

const getKeypointLabelValues = (labels: Label[]): { value: string; title: string }[] => (
    labels.flatMap((label: any): { value: string; title: string }[] => {
        if (label.type !== 'skeleton' || !label.structure?.sublabels) {
            return [];
        }

        return label.structure.sublabels.map((sublabel: any) => {
            const sublabelName = `${label.name} / ${sublabel.name}`;
            return {
                value: sublabelName,
                title: sublabelName,
            };
        });
    })
);

const getKeypointAttributesSubfields = (labels: Label[]): Record<string, any> => {
    const subfields: Record<string, any> = {};
    labels.forEach((label: any): void => {
        if (label.type === 'skeleton' && label.structure?.sublabels) {
            label.structure.sublabels.forEach((sublabel: any): void => {
                const sublabelDisplayLabel = `${label.name} / ${sublabel.name}`;
                const sublabelKey = adjustName(sublabelDisplayLabel);
                const attributeSubfield = buildAttributeSubfield(sublabelDisplayLabel, sublabel.attributes);
                if (attributeSubfield) {
                    subfields[sublabelKey] = attributeSubfield;
                }
            });
        }
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
    const [keypointConfig, setKeypointConfig] = useState<Config>(AntdConfig);

    const dispatch = useDispatch();
    const [immutableTree, setImmutableTree] = useState<ImmutableTree>(defaultTree);
    const [keypointImmutableTree, setKeypointImmutableTree] = useState<ImmutableTree>(defaultTree);
    const [filters, setFilters] = useState([] as StoredFilter[]);

    useEffect(() => {
        const keypointLabelValues = getKeypointLabelValues(labels);
        const keypointAttributesSubfields = getKeypointAttributesSubfields(labels);
        const initialConfig = {
            ...AntdConfig,
            fields: {
                label: {
                    label: 'Label',
                    type: 'select',
                    valueSources: ['value'] as 'value'[],
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
                rotation: {
                    label: 'Rotation',
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
                score: {
                    label: 'Score',
                    type: 'number',
                    fieldSettings: { min: 0, max: 1 },
                },
                votes: {
                    label: 'Votes',
                    type: 'number',
                    fieldSettings: { min: 0 },
                },
                zOrder: {
                    label: 'Z order',
                    type: 'number',
                },
                attr: {
                    label: 'Attributes',
                    type: '!struct',
                    subfields: getAttributesSubfields(labels),
                    fieldSettings: {
                        treeSelectOnlyLeafs: true,
                        treeDefaultExpandAll: false,
                        treeNodeFilterProp: 'title',
                    },
                },
            },
            settings: {
                ...AntdConfig.settings,
                renderField: (_props: any) => <FieldDropdown {..._props} />,
                // using FieldDropdown because we cannot use antd because of antd-related bugs
                // https://github.com/ukrbublik/react-awesome-query-builder/issues/224
            },
        };
        const initialKeypointConfig = {
            ...AntdConfig,
            fields: {
                label: {
                    label: 'Label',
                    type: 'select',
                    operators: ['select_equals', 'select_any_in'],
                    valueSources: ['value'] as 'value'[],
                    fieldSettings: {
                        listValues: keypointLabelValues,
                    },
                },
                occluded: {
                    label: 'Occluded',
                    type: 'boolean',
                },
                ...(Object.keys(keypointAttributesSubfields).length ? {
                    attr: {
                        label: 'Attributes',
                        type: '!struct',
                        subfields: keypointAttributesSubfields,
                        fieldSettings: {
                            treeSelectOnlyLeafs: true,
                            treeDefaultExpandAll: false,
                            treeNodeFilterProp: 'title',
                        },
                    },
                } : {}),
            },
            settings: {
                ...AntdConfig.settings,
                renderField: (_props: any) => <FieldDropdown {..._props} />,
            },
        };

        setConfig(initialConfig);
        setKeypointConfig(initialKeypointConfig);
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
            const restoreTree = (logic: object | undefined, builderConfig: Config): ImmutableTree => {
                if (!isEmptyLogic(logic)) {
                    const tree = QbUtils.loadFromJsonLogic(logic, builderConfig);
                    if (tree) {
                        return QbUtils.checkTree(tree, builderConfig);
                    }
                }

                throw new Error();
            };

            try {
                setImmutableTree(restoreTree(activeFilters[0], config));
            } catch (_: any) {
                setImmutableTree(defaultTree);
            }

            try {
                setKeypointImmutableTree(restoreTree(activeFilters[1], keypointConfig));
            } catch (_: any) {
                setKeypointImmutableTree(defaultTree);
            }
        }
    }, [visible]);

    const applyFilters = (filtersData: object[]): void => {
        dispatch(changeAnnotationsFilters(filtersData));
        dispatch(fetchAnnotationsAsync());
        dispatch(showFilters(false));
    };

    const confirmModal = (): void => {
        const logic = QbUtils.jsonLogicFormat(immutableTree, config).logic || {};
        const keypointLogic = QbUtils.jsonLogicFormat(keypointImmutableTree, keypointConfig).logic || {};
        const currentFilter: StoredFilter = {
            id: QbUtils.uuid(),
            logic,
            keypointLogic,
        };
        const updatedFilters = filters.filter(
            (filter) => JSON.stringify(filter.logic) !== JSON.stringify(currentFilter.logic) ||
                JSON.stringify(filter.keypointLogic || {}) !== JSON.stringify(currentFilter.keypointLogic || {}),
        );
        setFilters([currentFilter, ...updatedFilters].slice(0, 10));
        const hasObjectFilter = Object.keys(logic).length > 0;
        const hasKeypointFilter = Object.keys(keypointLogic).length > 0;
        if (hasKeypointFilter) {
            applyFilters([logic, keypointLogic]);
        } else if (hasObjectFilter) {
            applyFilters([logic]);
        } else {
            applyFilters([]);
        }
    };

    const isModalConfirmable = (): boolean => {
        const objectFilterQuery = (QbUtils.queryString(immutableTree, config) || '').trim();
        const keypointFilterQuery = (QbUtils.queryString(keypointImmutableTree, keypointConfig) || '').trim();
        const hasObjectFilter = objectFilterQuery.length > 0;
        const hasKeypointFilter = keypointFilterQuery.length > 0;

        return (hasObjectFilter || hasKeypointFilter) &&
            (!hasObjectFilter || QbUtils.isValidTree(immutableTree, config)) &&
            (!hasKeypointFilter || QbUtils.isValidTree(keypointImmutableTree, keypointConfig));
    };

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

    const onKeypointFilterChange = (tree: ImmutableTree): void => {
        setKeypointImmutableTree(tree);
    };

    const menu = (
        <Menu
            items={filters
                .map((filter: StoredFilter) => {
                    // if a logic received from local storage does not correspond to current config
                    // which depends on label specification
                    // (it can be when history from another task with another specification or when label was removed)
                    // loadFromJsonLogic() prints a warning to console
                    // the are not ways to configure this behaviour

                    const tree = isEmptyLogic(filter.logic) ?
                        null :
                        QbUtils.loadFromJsonLogic(filter.logic, config);
                    const keypointTree = !isEmptyLogic(filter.keypointLogic) ?
                        QbUtils.loadFromJsonLogic(filter.keypointLogic, keypointConfig) : null;
                    const objectQueryString = tree ? QbUtils.queryString(tree, config) : '';
                    const keypointQueryString = keypointTree ?
                        QbUtils.queryString(keypointTree, keypointConfig) : '';
                    const queryString = [
                        objectQueryString,
                        keypointQueryString ? `Elements: ${keypointQueryString}` : '',
                    ].filter((item) => !!item).join(' | ');

                    return {
                        tree, keypointTree, queryString, filter,
                    };
                })
                .filter(({ queryString }) => !!queryString)
                .map(({
                    filter, tree, keypointTree, queryString,
                }) => ({
                    key: filter.id,
                    label: queryString,
                    onClick: () => {
                        setImmutableTree((tree as ImmutableTree) || defaultTree);
                        setKeypointImmutableTree((keypointTree as ImmutableTree) || defaultTree);
                    },
                }))}
        />
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
                    <Button type='text' className='cvat-filters-modal-recently-used-button'>
                        Recently used
                        {' '}
                        <DownOutlined />
                    </Button>
                </Popover>
            </div>
            {!!config.fields && (
                <>
                    <Typography.Text strong>Objects</Typography.Text>
                    <Query
                        {...config}
                        value={immutableTree as ImmutableTree}
                        onChange={onChange}
                        renderBuilder={renderBuilder}
                    />
                </>
            )}
            {!!keypointConfig.fields && (
                <>
                    <Typography.Text strong>Elements</Typography.Text>
                    <Query
                        {...keypointConfig}
                        value={keypointImmutableTree as ImmutableTree}
                        onChange={onKeypointFilterChange}
                        renderBuilder={renderBuilder}
                    />
                </>
            )}
        </Modal>
    );
}

export default React.memo(FiltersModalComponent);
