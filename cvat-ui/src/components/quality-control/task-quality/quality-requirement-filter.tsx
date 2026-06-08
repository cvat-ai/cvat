// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useMemo, useState } from 'react';
import {
    AntdConfig,
    AntdWidgets,
    Builder,
    Config,
    ImmutableTree,
    Query,
    Utils as QbUtils,
} from '@react-awesome-query-builder/antd';
import { DownOutlined, FilterOutlined } from '@ant-design/icons';
import Button from 'antd/lib/button';
import Input from 'antd/lib/input';
import Menu from 'antd/lib/menu';
import Popover from 'antd/lib/popover';
import Space from 'antd/lib/space';
import Text from 'antd/lib/typography/Text';
import { Label } from 'cvat-core-wrapper';

const { FieldDropdown } = AntdWidgets;

const FILTERS_HISTORY = 'qualityRequirementFiltersHistory';
const createDefaultTree = (): ImmutableTree => QbUtils.loadTree({ type: 'group', id: QbUtils.uuid() });

interface Props {
    labels: Label[];
    value?: string;
    parentFilters?: string[];
    disabled?: boolean;
    onChange?: (value: string) => void;
}

interface StoredFilter {
    id: string;
    logic: Record<string, unknown>;
}

const ANNOTATION_TYPE_VALUES = [
    { value: 'tag', title: 'Tag' },
    { value: 'rectangle', title: 'Rectangle' },
    { value: 'points', title: 'Points' },
    { value: 'polyline', title: 'Polyline' },
    { value: 'polygon', title: 'Polygon' },
    { value: 'cuboid', title: 'Cuboid' },
    { value: 'ellipse', title: 'Ellipse' },
    { value: 'skeleton', title: 'Skeleton' },
    { value: 'skeleton_keypoint', title: 'Skeleton keypoint' },
    { value: 'mask', title: 'Mask' },
];

const SOURCE_VALUES = [
    { value: 'manual', title: 'Manual' },
    { value: 'ground_truth', title: 'Ground truth' },
    { value: 'semi-auto', title: 'Semi-auto' },
    { value: 'auto', title: 'Auto' },
    { value: 'file', title: 'File' },
];

const getLabelOptions = (labels: Label[]): { value: string; title: string }[] => labels.flatMap((label) => {
    const options = [{
        value: label.name,
        title: label.name,
    }];

    if (label.type === 'skeleton' && label.structure?.sublabels) {
        options.push(...label.structure.sublabels.map((sublabel) => {
            const name = `${label.name} / ${sublabel.name}`;
            return {
                value: name,
                title: name,
            };
        }));
    }

    return options;
});

const getAttributeNameOptions = (labels: Label[]): { value: string; title: string }[] => {
    const names = new Set<string>();
    labels.forEach((label): void => {
        label.attributes.forEach((attribute): void => {
            names.add(attribute.name);
        });

        if (label.type === 'skeleton' && label.structure?.sublabels) {
            label.structure.sublabels.forEach((sublabel): void => {
                sublabel.attributes.forEach((attribute): void => {
                    names.add(attribute.name);
                });
            });
        }
    });

    return [...names].sort().map((name) => ({
        value: name,
        title: name,
    }));
};

const getAttributeValueOptions = (labels: Label[]): { value: string; title: string }[] => {
    const values = new Set<string>();
    labels.forEach((label): void => {
        label.attributes.forEach((attribute): void => {
            attribute.values.forEach((value): void => {
                values.add(value);
            });
        });

        if (label.type === 'skeleton' && label.structure?.sublabels) {
            label.structure.sublabels.forEach((sublabel): void => {
                sublabel.attributes.forEach((attribute): void => {
                    attribute.values.forEach((value): void => {
                        values.add(value);
                    });
                });
            });
        }
    });

    return [...values].sort().map((value) => ({
        value,
        title: value,
    }));
};

const getAttributesSubfields = (labels: Label[]): Record<string, unknown> => ({
    name: {
        label: 'Name',
        type: 'select',
        fieldSettings: {
            listValues: getAttributeNameOptions(labels),
        },
    },
    value: {
        label: 'Value',
        type: 'select',
        fieldSettings: {
            listValues: getAttributeValueOptions(labels),
        },
    },
});

const getShapeSubfields = (labels: Label[]): Record<string, unknown> => ({
    label: {
        label: 'Label',
        type: 'text',
    },
    type: {
        label: 'Type',
        type: 'select',
        fieldSettings: {
            listValues: ANNOTATION_TYPE_VALUES,
        },
    },
    area: {
        label: 'Area',
        type: 'number',
        fieldSettings: { min: 0 },
    },
    source: {
        label: 'Source',
        type: 'select',
        fieldSettings: {
            listValues: SOURCE_VALUES,
        },
    },
    occluded: {
        label: 'Occluded',
        type: 'boolean',
    },
    track_id: {
        label: 'Track Id',
        type: 'number',
        fieldSettings: { min: 0 },
    },
    outside: {
        label: 'Outside',
        type: 'boolean',
    },
    keyframe: {
        label: 'Keyframe',
        type: 'boolean',
    },
    attribute: {
        label: 'Attributes',
        type: '!struct',
        subfields: getAttributesSubfields(labels),
        fieldSettings: {
            treeSelectOnlyLeafs: true,
            treeDefaultExpandAll: false,
            treeNodeFilterProp: 'title',
        },
    },
});

const isEmptyLogic = (logic: Record<string, unknown> | null): boolean => !logic || !Object.keys(logic).length;

const parseFilter = (value?: string): Record<string, unknown> | null => {
    if (!value) {
        return null;
    }

    try {
        const logic = JSON.parse(value);
        return logic && !Array.isArray(logic) && typeof logic === 'object' ? logic : null;
    } catch (_: unknown) {
        return null;
    }
};

const parseFilters = (filters: string[]): Record<string, unknown>[] => (
    filters
        .map(parseFilter)
        .filter((filter): filter is Record<string, unknown> => !isEmptyLogic(filter))
);

const combineFiltersWithAnd = (filters: string[]): Record<string, unknown> | null => {
    const parsedFilters = parseFilters(filters);
    if (!parsedFilters.length) {
        return null;
    }

    if (parsedFilters.length === 1) {
        return parsedFilters[0];
    }

    return {
        and: parsedFilters,
    };
};

const loadTreeFromValue = (value: string | undefined, config: Config): ImmutableTree => {
    const logic = parseFilter(value);
    if (isEmptyLogic(logic)) {
        return createDefaultTree();
    }

    const tree = QbUtils.loadFromJsonLogic(logic, config);
    return tree ? QbUtils.checkTree(tree, config) : createDefaultTree();
};

export default function QualityRequirementFilter(props: Readonly<Props>): JSX.Element {
    const {
        labels,
        value,
        parentFilters = [],
        disabled,
        onChange,
    } = props;
    const [visible, setVisible] = useState(false);
    const [draftTree, setDraftTree] = useState<ImmutableTree>(createDefaultTree);
    const [filters, setFilters] = useState<StoredFilter[]>(() => {
        const rawFilters = window.localStorage.getItem(FILTERS_HISTORY)?.trim() || '[]';
        try {
            return JSON.parse(rawFilters);
        } catch (_: unknown) {
            return [];
        }
    });

    const config = useMemo<Config>(() => {
        const attributeSubfields = getAttributesSubfields(labels);
        const shapeSubfields = getShapeSubfields(labels);
        return {
            ...AntdConfig,
                fields: {
                'shape.label': {
                    label: 'Label',
                    type: 'select',
                    valueSources: ['value'] as 'value'[],
                    fieldSettings: {
                        listValues: getLabelOptions(labels),
                    },
                },
                'shape.type': {
                    label: 'Type',
                    type: 'select',
                    fieldSettings: {
                        listValues: ANNOTATION_TYPE_VALUES,
                    },
                },
                'shape.area': {
                    label: 'Area',
                    type: 'number',
                    fieldSettings: { min: 0 },
                },
                'shape.source': {
                    label: 'Source',
                    type: 'select',
                    fieldSettings: {
                        listValues: SOURCE_VALUES,
                    },
                },
                'shape.skeleton': {
                    label: 'Skeleton',
                    type: '!struct',
                    subfields: shapeSubfields,
                    fieldSettings: {
                        treeSelectOnlyLeafs: true,
                        treeDefaultExpandAll: false,
                        treeNodeFilterProp: 'title',
                    },
                },
                'shape.track': {
                    label: 'Track',
                    type: '!struct',
                    subfields: shapeSubfields,
                    fieldSettings: {
                        treeSelectOnlyLeafs: true,
                        treeDefaultExpandAll: false,
                        treeNodeFilterProp: 'title',
                    },
                },
                'shape.attribute': {
                    label: 'Attributes',
                    type: '!struct',
                    subfields: attributeSubfields,
                    fieldSettings: {
                        treeSelectOnlyLeafs: true,
                        treeDefaultExpandAll: false,
                        treeNodeFilterProp: 'title',
                    },
                },
                'shape.occluded': {
                    label: 'Occluded',
                    type: 'boolean',
                },
                'shape.track_id': {
                    label: 'Track Id',
                    type: 'number',
                    fieldSettings: { min: 0 },
                },
                'shape.outside': {
                    label: 'Outside',
                    type: 'boolean',
                },
                'shape.keyframe': {
                    label: 'Keyframe',
                    type: 'boolean',
                },
            },
            settings: {
                ...AntdConfig.settings,
                renderField: (_props: any) => <FieldDropdown {..._props} />,
            },
        };
    }, [labels]);
    const readonlyConfig = useMemo<Config>(() => ({
        ...config,
        settings: {
            ...config.settings,
            canReorder: false,
            showLock: false,
            immutableGroupsMode: true,
            immutableFieldsMode: true,
            immutableOpsMode: true,
            immutableValuesMode: true,
        },
    }), [config]);
    const parentFilterTree = useMemo<ImmutableTree | null>(() => {
        const parentFilter = combineFiltersWithAnd(parentFilters);
        if (isEmptyLogic(parentFilter)) {
            return null;
        }

        const tree = QbUtils.loadFromJsonLogic(parentFilter, readonlyConfig);
        return tree ? QbUtils.checkTree(tree, readonlyConfig) : null;
    }, [parentFilters, readonlyConfig]);

    const preview = useMemo(() => {
        const logic = parseFilter(value);
        if (isEmptyLogic(logic)) {
            return '';
        }

        const tree = QbUtils.loadFromJsonLogic(logic, config);
        return tree ? QbUtils.queryString(tree, config) || value || '' : value || '';
    }, [config, value]);

    const showBuilder = (): void => {
        if (!disabled) {
            setDraftTree(loadTreeFromValue(value, config));
            setVisible(true);
        }
    };

    const onBuilderVisibleChange = (nextVisible: boolean): void => {
        if (disabled) {
            return;
        }

        if (nextVisible) {
            setDraftTree(loadTreeFromValue(value, config));
        }

        setVisible(nextVisible);
    };

    const updateFiltersHistory = (logic: Record<string, unknown>): void => {
        if (isEmptyLogic(logic)) {
            return;
        }

        const currentFilter: StoredFilter = {
            id: QbUtils.uuid(),
            logic,
        };
        const updatedFilters = filters.filter((filter) => (
            JSON.stringify(filter.logic) !== JSON.stringify(logic)
        ));
        const nextFilters = [currentFilter, ...updatedFilters].slice(0, 10);
        setFilters(nextFilters);
        window.localStorage.setItem(FILTERS_HISTORY, JSON.stringify(nextFilters));
    };

    const applyFilter = (): void => {
        const logic = QbUtils.jsonLogicFormat(draftTree, config).logic as Record<string, unknown> | undefined;
        const nextLogic = logic || {};
        updateFiltersHistory(nextLogic);
        onChange?.(isEmptyLogic(nextLogic) ? '' : JSON.stringify(nextLogic));
        setVisible(false);
    };

    const menu = (
        <Menu
            items={filters
                .map((filter) => {
                    const tree = QbUtils.loadFromJsonLogic(filter.logic, config);
                    const queryString = tree ? QbUtils.queryString(tree, config) : '';
                    return {
                        filter,
                        tree,
                        queryString,
                    };
                })
                .filter(({ queryString }) => !!queryString)
                .map(({ filter, tree, queryString }) => ({
                    key: filter.id,
                    label: queryString,
                    onClick: () => setDraftTree((tree as ImmutableTree) || createDefaultTree()),
                }))}
        />
    );

    const renderBuilder = (builderProps: any): JSX.Element => (
        <div className='query-builder-container'>
            <div className='query-builder'>
                <Builder {...builderProps} />
            </div>
        </div>
    );

    const builder = (
        <div className='cvat-resource-page-filters-builder cvat-quality-requirement-filter-builder'>
            {filters.length ? (
                <Popover
                    destroyTooltipOnHide
                    trigger='click'
                    placement='bottomRight'
                    overlayInnerStyle={{ padding: 0 }}
                    content={menu}
                >
                    <Button
                        type='text'
                        size='small'
                        className='cvat-quality-requirement-filter-recent-button'
                    >
                        Recent
                        {' '}
                        <DownOutlined />
                    </Button>
                </Popover>
            ) : null}
            {parentFilterTree ? (
                <div className='cvat-quality-requirement-filter-section'>
                    <Text>Parent filter</Text>
                    <div className='cvat-quality-requirement-filter-readonly-builder'>
                        <Query
                            {...readonlyConfig}
                            value={parentFilterTree}
                            onChange={() => {}}
                            renderBuilder={renderBuilder}
                        />
                    </div>
                </div>
            ) : null}
            {parentFilterTree ? (
                <Text className='cvat-quality-requirement-filter-section-title'>Current filter</Text>
            ) : null}
            <Query
                {...config}
                value={draftTree}
                onChange={(tree: ImmutableTree) => setDraftTree(tree)}
                renderBuilder={renderBuilder}
            />
            <Space className='cvat-resource-page-filters-space'>
                <Button
                    className='cvat-reset-filters-button'
                    disabled={!QbUtils.queryString(draftTree, config)}
                    size='small'
                    onClick={() => setDraftTree(createDefaultTree())}
                >
                    Reset
                </Button>
                <Button
                    className='cvat-apply-filters-button'
                    size='small'
                    type='primary'
                    disabled={!QbUtils.isValidTree(draftTree, config)}
                    onClick={applyFilter}
                >
                    Apply
                </Button>
            </Space>
        </div>
    );

    return (
        <Popover
            placement='bottomRight'
            open={visible}
            destroyTooltipOnHide
            trigger='click'
            overlayInnerStyle={{ padding: 0 }}
            content={builder}
            onOpenChange={onBuilderVisibleChange}
        >
            <Input
                className='cvat-quality-requirement-filter-input'
                readOnly
                disabled={disabled}
                placeholder='Filter'
                value={preview}
                onClick={showBuilder}
                suffix={(
                    <Button
                        type='text'
                        icon={<FilterOutlined />}
                        disabled={disabled}
                        onClick={showBuilder}
                    />
                )}
            />
        </Popover>
    );
}
