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
const restoreName = (name: string): string => name.replace(/\u2219/g, '.');

const buildAttributeSubfield = (
    displayLabel: string,
    attributes: Label['attributes'],
): Record<string, unknown> | null => {
    if (!attributes.length) {
        return null;
    }

    const attributeSubfield: Record<string, unknown> = {
        type: '!struct',
        label: displayLabel,
        subfields: {},
    };

    const attrSubfields = attributeSubfield.subfields as Record<string, any>;
    attributes.forEach((attribute): void => {
        const adjustedAttrName = adjustName(attribute.name);
        attrSubfields[adjustedAttrName] = {
            label: attribute.name,
            type: getConvertedInputType(attribute.inputType),
        };
        if (attrSubfields[adjustedAttrName].type === 'select') {
            attrSubfields[adjustedAttrName] = {
                ...attrSubfields[adjustedAttrName],
                fieldSettings: {
                    listValues: attribute.values,
                },
            };
        }
    });

    return attributeSubfield;
};

const getAttributesSubfields = (labels: Label[], includeSublabels = true): Record<string, unknown> => {
    const subfields: Record<string, unknown> = {};
    labels.forEach((label): void => {
        const attributeSubfield = buildAttributeSubfield(label.name, label.attributes);
        if (attributeSubfield) {
            subfields[adjustName(label.name)] = attributeSubfield;
        }

        if (includeSublabels && label.type === 'skeleton' && label.structure?.sublabels) {
            label.structure.sublabels.forEach((sublabel): void => {
                const displayLabel = `${label.name} / ${sublabel.name}`;
                const sublabelAttributeSubfield = buildAttributeSubfield(displayLabel, sublabel.attributes);
                if (sublabelAttributeSubfield) {
                    subfields[adjustName(displayLabel)] = sublabelAttributeSubfield;
                }
            });
        }
    });

    return subfields;
};

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

const ATTRIBUTE_UI_PREFIXES = ['shape.skeleton.attribute', 'shape.track.attribute', 'shape.attribute'];
const ATTRIBUTE_SERVER_FIELD_SUFFIXES = ['name', 'value'];

const getAttributePathParts = (varName: string): {
    prefix: string;
    contextPrefix: string;
    labelName: string;
    attributeName: string;
} | null => {
    const prefix = ATTRIBUTE_UI_PREFIXES.find((candidate) => varName.startsWith(`${candidate}.`));
    if (!prefix) {
        return null;
    }

    const pathParts = varName.slice(prefix.length + 1).split('.');
    if (pathParts.length !== 2 || ATTRIBUTE_SERVER_FIELD_SUFFIXES.includes(pathParts[0])) {
        return null;
    }

    return {
        prefix,
        contextPrefix: prefix.replace(/\.attribute$/, ''),
        labelName: restoreName(pathParts[0]),
        attributeName: restoreName(pathParts[1]),
    };
};

const isJsonLogicObject = (logic: unknown): logic is Record<string, unknown> => (
    !!logic && !Array.isArray(logic) && typeof logic === 'object'
);

const getVarName = (operand: unknown): string | null => (
    isJsonLogicObject(operand) && typeof operand.var === 'string' ? operand.var : null
);

const makeAttributeServerCondition = (
    op: string,
    args: unknown[],
    varIndex: number,
    pathParts: NonNullable<ReturnType<typeof getAttributePathParts>>,
): Record<string, unknown> => {
    const valueArgs = [...args];
    valueArgs[varIndex] = { var: `${pathParts.prefix}.value` };

    return {
        and: [
            { '==': [{ var: `${pathParts.contextPrefix}.label` }, pathParts.labelName] },
            { '==': [{ var: `${pathParts.prefix}.name` }, pathParts.attributeName] },
            { [op]: valueArgs },
        ],
    };
};

const convertAttributeUiLogicToServer = (logic: unknown): unknown => {
    if (Array.isArray(logic)) {
        return logic.map(convertAttributeUiLogicToServer);
    }

    if (!isJsonLogicObject(logic)) {
        return logic;
    }

    const [op, rawArgs] = Object.entries(logic)[0] || [];
    if (!op) {
        return logic;
    }

    const args = Array.isArray(rawArgs) ? rawArgs : [rawArgs];
    if (['==', '!=', '<', '>', '<=', '>=', 'in'].includes(op)) {
        const varIndex = args.findIndex((arg) => !!getVarName(arg));
        const varName = varIndex >= 0 ? getVarName(args[varIndex]) : null;
        const pathParts = varName ? getAttributePathParts(varName) : null;
        if (pathParts) {
            return makeAttributeServerCondition(op, args, varIndex, pathParts);
        }
    }

    return {
        [op]: Array.isArray(rawArgs) ?
            rawArgs.map(convertAttributeUiLogicToServer) :
            convertAttributeUiLogicToServer(rawArgs),
    };
};

const getEqualsValue = (logic: unknown, varName: string): unknown => {
    if (!isJsonLogicObject(logic)) {
        return undefined;
    }

    const args = logic['=='];
    if (!Array.isArray(args) || args.length !== 2) {
        return undefined;
    }

    return getVarName(args[0]) === varName ? args[1] : undefined;
};

const getValueConditionInfo = (logic: unknown, valueVarName: string): {
    op: string;
    args: unknown[];
    varIndex: number;
} | null => {
    if (!isJsonLogicObject(logic)) {
        return null;
    }

    const [op, rawArgs] = Object.entries(logic)[0] || [];
    if (!op || !['==', '!=', '<', '>', '<=', '>=', 'in'].includes(op) || !Array.isArray(rawArgs)) {
        return null;
    }

    const varIndex = rawArgs.findIndex((arg) => getVarName(arg) === valueVarName);
    return varIndex >= 0 ? { op, args: rawArgs, varIndex } : null;
};

const makeAttributeUiCondition = (
    valueConditionInfo: NonNullable<ReturnType<typeof getValueConditionInfo>>,
    prefix: string,
    labelName: string,
    attributeName: string,
): Record<string, unknown> => {
    const valueArgs = [...valueConditionInfo.args];
    valueArgs[valueConditionInfo.varIndex] = {
        var: `${prefix}.${adjustName(labelName)}.${adjustName(attributeName)}`,
    };

    return { [valueConditionInfo.op]: valueArgs };
};

// An attribute condition is encoded on the server as a self-contained, nested `and` block of
// exactly three parts: a label equality, an attribute-name equality and the value condition
// (see makeAttributeServerCondition). Fuse such a block back into a single UI condition only when
// those three parts are its entire content. This keeps each attribute's label/name/value bound
// together, so multiple attribute conditions (stored as separate nested blocks) can never be
// cross-paired. A flattened or hand-edited `and` that does not match this exact shape is left
// untouched and rendered as its raw parts rather than silently mis-grouped.
const tryFuseAttributeAndBlock = (convertedArgs: unknown[]): unknown | null => {
    if (convertedArgs.length !== 3) {
        return null;
    }

    for (const prefix of ATTRIBUTE_UI_PREFIXES) {
        const contextPrefix = prefix.replace(/\.attribute$/, '');
        const labelArg = convertedArgs.find((arg) => getEqualsValue(arg, `${contextPrefix}.label`) !== undefined);
        const nameArg = convertedArgs.find((arg) => getEqualsValue(arg, `${prefix}.name`) !== undefined);
        const valueArg = convertedArgs.find((arg) => !!getValueConditionInfo(arg, `${prefix}.value`));

        if (!labelArg || !nameArg || !valueArg ||
            labelArg === nameArg || labelArg === valueArg || nameArg === valueArg) {
            continue;
        }

        const labelName = getEqualsValue(labelArg, `${contextPrefix}.label`);
        const attributeName = getEqualsValue(nameArg, `${prefix}.name`);
        const valueConditionInfo = getValueConditionInfo(valueArg, `${prefix}.value`);

        if (typeof labelName === 'string' && typeof attributeName === 'string' && valueConditionInfo) {
            return makeAttributeUiCondition(valueConditionInfo, prefix, labelName, attributeName);
        }
    }

    return null;
};

const convertAttributeServerLogicToUi = (logic: unknown): unknown => {
    if (Array.isArray(logic)) {
        return logic.map(convertAttributeServerLogicToUi);
    }

    if (!isJsonLogicObject(logic)) {
        return logic;
    }

    const [op, rawArgs] = Object.entries(logic)[0] || [];
    if (!op) {
        return logic;
    }

    if (op === 'and' && Array.isArray(rawArgs)) {
        const convertedArgs = rawArgs.map(convertAttributeServerLogicToUi);
        const fused = tryFuseAttributeAndBlock(convertedArgs);
        if (fused) {
            return fused;
        }

        return { and: convertedArgs };
    }

    return {
        [op]: Array.isArray(rawArgs) ?
            rawArgs.map(convertAttributeServerLogicToUi) :
            convertAttributeServerLogicToUi(rawArgs),
    };
};

const isEmptyLogic = (logic: unknown): boolean => !isJsonLogicObject(logic) || !Object.keys(logic).length;

const parseFilter = (value?: string): Record<string, unknown> | null => {
    if (!value) {
        return null;
    }

    try {
        const logic = JSON.parse(value);
        return isJsonLogicObject(logic) ? logic : null;
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
    const parsedLogic = parseFilter(value);
    const logic = convertAttributeServerLogicToUi(parsedLogic);
    if (isEmptyLogic(logic)) {
        return createDefaultTree();
    }

    const tree = QbUtils.loadFromJsonLogic(logic as Record<string, unknown>, config);
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
                'shape.attribute.name': {
                    label: 'Attribute name',
                    type: 'text',
                    hideForSelect: true,
                },
                'shape.attribute.value': {
                    label: 'Attribute value',
                    type: 'text',
                    hideForSelect: true,
                },
                'shape.track.attribute.name': {
                    label: 'Track attribute name',
                    type: 'text',
                    hideForSelect: true,
                },
                'shape.track.attribute.value': {
                    label: 'Track attribute value',
                    type: 'text',
                    hideForSelect: true,
                },
                'shape.skeleton.attribute.name': {
                    label: 'Skeleton attribute name',
                    type: 'text',
                    hideForSelect: true,
                },
                'shape.skeleton.attribute.value': {
                    label: 'Skeleton attribute value',
                    type: 'text',
                    hideForSelect: true,
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

        const tree = QbUtils.loadFromJsonLogic(
            convertAttributeServerLogicToUi(parentFilter) as Record<string, unknown>,
            readonlyConfig,
        );
        return tree ? QbUtils.checkTree(tree, readonlyConfig) : null;
    }, [parentFilters, readonlyConfig]);

    const preview = useMemo(() => {
        const logic = convertAttributeServerLogicToUi(parseFilter(value));
        if (isEmptyLogic(logic)) {
            return '';
        }

        const tree = QbUtils.loadFromJsonLogic(logic as Record<string, unknown>, config);
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
        const nextLogic = (convertAttributeUiLogicToServer(logic || {}) || {}) as Record<string, unknown>;
        updateFiltersHistory(nextLogic);
        onChange?.(isEmptyLogic(nextLogic) ? '' : JSON.stringify(nextLogic));
        setVisible(false);
    };

    const menu = (
        <Menu
            items={filters
                .map((filter) => {
                    const tree = QbUtils.loadFromJsonLogic(
                        convertAttributeServerLogicToUi(filter.logic) as Record<string, unknown>,
                        config,
                    );
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
