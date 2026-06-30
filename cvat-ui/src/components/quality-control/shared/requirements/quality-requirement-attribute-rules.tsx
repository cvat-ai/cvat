// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useState } from 'react';
import {
    DeleteOutlined,
    PlusOutlined,
    QuestionCircleOutlined,
    UndoOutlined,
} from '@ant-design/icons';
import { Config } from '@react-awesome-query-builder/antd';
import Button from 'antd/lib/button';
import Checkbox from 'antd/lib/checkbox';
import Divider from 'antd/lib/divider';
import Form from 'antd/lib/form';
import { FormInstance } from 'antd/lib/form/Form';
import { Col, Row } from 'antd/lib/grid';
import InputNumber from 'antd/lib/input-number';
import Select from 'antd/lib/select';
import Space from 'antd/lib/space';
import Switch from 'antd/lib/switch';
import Text from 'antd/lib/typography/Text';
import CVATTable from 'components/common/cvat-table';
import CVATTooltip from 'components/common/cvat-tooltip';
import { QualityRequirementAttributeComparator } from 'cvat-core/src/quality/server-response-types';
import {
    AttributeOption,
    AttributeRuleFormValue,
    formatDescription,
    RequirementFormValues,
} from './quality-requirement-form-utils';

const ATTRIBUTE_COMPARATORS: QualityRequirementAttributeComparator[] = Object.values(
    QualityRequirementAttributeComparator,
);
const ATTRIBUTE_RULE_DEFAULT_THRESHOLD = 0.8;
const attributeRulesFilterConfig: Partial<Config> = {
    fields: {
        name: {
            label: 'Name',
            type: 'text',
            valueSources: ['value'],
        },
        enabled: {
            label: 'Enabled',
            type: 'boolean',
            valueSources: ['value'],
        },
        comparator: {
            label: 'Comparator',
            type: 'select',
            valueSources: ['value'],
            fieldSettings: {
                listValues: ATTRIBUTE_COMPARATORS.map((value) => ({ value, title: value })),
            },
        },
    },
};

interface AttributeRuleRow {
    key: string;
    fieldName: number;
    index: number;
    specId?: number;
    name: string;
    enabled: boolean;
    comparator: QualityRequirementAttributeComparator;
    isLocal: boolean;
    hasInheritedCounterpart: boolean;
    searchValue: string;
}

interface Props {
    form: FormInstance<RequirementFormValues>;
    settingsId: number;
    attributeComparisonDescription: string;
    attributeComparisonOverridden: boolean;
    attributeOptions: AttributeOption[];
    attributeOptionsBySpecId: Map<number, AttributeOption>;
    formDisabled: boolean;
    inheritedAttributeRuleSpecIds: Set<number>;
    matchUnspecifiedOverridden: boolean;
    parentRequirementId: number | null;
    markAttributeRuleChanged: (index: number) => void;
    markTouchedFields: (changedValues: Partial<RequirementFormValues>) => void;
    onRevertAttributeComparison: () => void;
    onRevertAttributeRule: (index: number) => void;
    onRevertMatchUnspecified: () => void;
    syncAttributeComparisonState: (nextRules: AttributeRuleFormValue[], nextMatchUnspecified: boolean) => void;
}

export default function QualityRequirementAttributeRules(props: Readonly<Props>): JSX.Element {
    const {
        form,
        settingsId,
        attributeComparisonDescription,
        attributeComparisonOverridden,
        attributeOptions,
        attributeOptionsBySpecId,
        formDisabled,
        inheritedAttributeRuleSpecIds,
        matchUnspecifiedOverridden,
        parentRequirementId,
        markAttributeRuleChanged,
        markTouchedFields,
        onRevertAttributeComparison,
        onRevertAttributeRule,
        onRevertMatchUnspecified,
        syncAttributeComparisonState,
    } = props;

    const [expandedAttributeRuleKeys, setExpandedAttributeRuleKeys] = useState<React.Key[]>([]);
    const watchedAttributeRules = Form.useWatch('attributeRules', form);
    const rules = (watchedAttributeRules ?? form.getFieldValue('attributeRules') ?? []) as AttributeRuleFormValue[];
    const usedSpecIds = new Set(
        rules
            .map((rule) => rule?.specId)
            .filter((specId: number | undefined): specId is number => typeof specId === 'number'),
    );

    const getAttributeComparisonStateClassName = (
        isLocal: boolean,
        hasInheritedCounterpart: boolean,
    ): string => {
        if (parentRequirementId === null || !hasInheritedCounterpart) {
            return '';
        }

        return isLocal ?
            'cvat-quality-requirement-overridden-attribute-rule' :
            'cvat-quality-requirement-inherited-attribute-rule';
    };

    const renderAttributeComparisonTitle = (): JSX.Element => {
        if (!attributeComparisonOverridden) {
            return <Text strong>Attribute comparison</Text>;
        }

        return (
            <Space size={4} className='cvat-quality-requirement-overridden-label'>
                <Text strong>Attribute comparison</Text>
                <CVATTooltip title='Revert to inherited value'>
                    <Button
                        type='link'
                        size='small'
                        icon={<UndoOutlined />}
                        className='cvat-quality-requirement-revert-button'
                        disabled={formDisabled}
                        onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            onRevertAttributeComparison();
                        }}
                    />
                </CVATTooltip>
            </Space>
        );
    };

    return (
        <>
            <Divider />
            <Row className='cvat-quality-requirement-form-section-title'>
                {renderAttributeComparisonTitle()}
                <CVATTooltip
                    title={formatDescription(attributeComparisonDescription)}
                    className='cvat-settings-tooltip'
                >
                    <QuestionCircleOutlined className='cvat-quality-settings-tooltip-icon' />
                </CVATTooltip>
            </Row>
            <Form.Item
                name='matchUnspecifiedAttributes'
                valuePropName='checked'
                className={matchUnspecifiedOverridden ? 'cvat-quality-requirement-overridden-attribute-rule' : ''}
            >
                <Checkbox>
                    <Space direction='vertical' size={0}>
                        <Space size={4}>
                            <Text className='cvat-quality-requirement-match-unspecified-label'>
                                Match unspecified attributes exactly
                            </Text>
                            {matchUnspecifiedOverridden && (
                                <CVATTooltip title='Revert to inherited value'>
                                    <Button
                                        type='link'
                                        size='small'
                                        icon={<UndoOutlined />}
                                        className='cvat-quality-requirement-revert-button'
                                        disabled={formDisabled}
                                        onClick={(event) => {
                                            event.preventDefault();
                                            event.stopPropagation();
                                            onRevertMatchUnspecified();
                                        }}
                                    />
                                </CVATTooltip>
                            )}
                        </Space>
                        <Text type='secondary'>
                            Attributes without a custom rule will be matched using Exact comparator.
                        </Text>
                    </Space>
                </Checkbox>
            </Form.Item>
            <Form.List name='attributeRules'>
                {(fields, { add, remove }): JSX.Element => {
                    const data = fields.map((field, index): AttributeRuleRow => {
                        const rule = rules[index] ?? {};
                        const attributeOption = typeof rule.specId === 'number' ?
                            attributeOptionsBySpecId.get(rule.specId) :
                            null;
                        const name = attributeOption?.label ?? (
                            typeof rule.specId === 'number' ? `Unknown attribute #${rule.specId}` : ''
                        );
                        const comparator = rule.comparator ?? QualityRequirementAttributeComparator.EXACT;

                        return {
                            key: String(field.key),
                            fieldName: field.name,
                            index,
                            specId: rule.specId,
                            name,
                            enabled: rule.enabled ?? true,
                            comparator,
                            isLocal: rule.isLocal ?? false,
                            hasInheritedCounterpart: typeof rule.specId === 'number' &&
                                inheritedAttributeRuleSpecIds.has(rule.specId),
                            searchValue: [
                                name,
                                rule.enabled ? 'enabled' : 'disabled',
                                comparator,
                            ].join(' ').toLowerCase(),
                        };
                    });

                    const addRule = (): void => {
                        const availableOption = attributeOptions.find((option) => !usedSpecIds.has(option.value));
                        if (!availableOption) {
                            return;
                        }

                        add({
                            specId: availableOption.value,
                            enabled: true,
                            comparator: QualityRequirementAttributeComparator.EXACT,
                            threshold: ATTRIBUTE_RULE_DEFAULT_THRESHOLD,
                            isLocal: true,
                        });
                        markTouchedFields({ attributeRules: form.getFieldValue('attributeRules') ?? [] });
                    };

                    return (
                        <CVATTable
                            tableTitle='Attribute rules'
                            className='cvat-quality-requirement-attribute-rules-table'
                            searchDataIndex={['searchValue']}
                            queryBuilder={{
                                config: attributeRulesFilterConfig,
                                memoryKey: 'recentlyAppliedQualityRequirementAttributeRulesFilters',
                                memoryCapacity: 10,
                            }}
                            csvExport={{ filename: `quality-requirement-attribute-rules-${settingsId}.csv` }}
                            renderHeaderActions={() => (
                                <Button
                                    type='primary'
                                    icon={<PlusOutlined />}
                                    disabled={
                                        formDisabled ||
                                        attributeOptions.every((option) => usedSpecIds.has(option.value))
                                    }
                                    onClick={addRule}
                                />
                            )}
                            rowClassName={(record: AttributeRuleRow): string => (
                                getAttributeComparisonStateClassName(record.isLocal, record.hasInheritedCounterpart)
                            )}
                            columns={[{
                                title: 'Name',
                                dataIndex: 'name',
                                sorter: (first: AttributeRuleRow, second: AttributeRuleRow) => (
                                    first.name.localeCompare(second.name)
                                ),
                                render: (_: string, record: AttributeRuleRow): JSX.Element => (
                                    <Form.Item
                                        name={[record.fieldName, 'specId']}
                                        className='cvat-quality-requirement-attribute-rule-field'
                                        rules={[{ required: true, message: 'This field is required' }]}
                                    >
                                        <Select
                                            showSearch
                                            disabled={formDisabled || record.hasInheritedCounterpart}
                                            optionFilterProp='children'
                                            onChange={() => markAttributeRuleChanged(record.index)}
                                        >
                                            {attributeOptions.map((option) => (
                                                <Select.Option
                                                    key={option.value}
                                                    value={option.value}
                                                    disabled={
                                                        usedSpecIds.has(option.value) &&
                                                        option.value !== rules[record.index]?.specId
                                                    }
                                                >
                                                    {option.label}
                                                </Select.Option>
                                            ))}
                                        </Select>
                                    </Form.Item>
                                ),
                            }, {
                                title: 'Enabled',
                                dataIndex: 'enabled',
                                sorter: (first: AttributeRuleRow, second: AttributeRuleRow) => (
                                    Number(first.enabled) - Number(second.enabled)
                                ),
                                render: (_: boolean, record: AttributeRuleRow): JSX.Element => (
                                    <Form.Item
                                        name={[record.fieldName, 'enabled']}
                                        valuePropName='checked'
                                        className='cvat-quality-requirement-attribute-rule-field'
                                    >
                                        <Switch
                                            disabled={formDisabled}
                                            onChange={() => markAttributeRuleChanged(record.index)}
                                        />
                                    </Form.Item>
                                ),
                            }, {
                                title: 'Comparator',
                                dataIndex: 'comparator',
                                sorter: (first: AttributeRuleRow, second: AttributeRuleRow) => (
                                    first.comparator.localeCompare(second.comparator)
                                ),
                                render: (_: string, record: AttributeRuleRow): JSX.Element => (
                                    <Form.Item
                                        name={[record.fieldName, 'comparator']}
                                        className='cvat-quality-requirement-attribute-rule-field'
                                    >
                                        <Select
                                            disabled={formDisabled}
                                            onChange={(value) => {
                                                markAttributeRuleChanged(record.index);
                                                if (value === QualityRequirementAttributeComparator.EXACT) {
                                                    setExpandedAttributeRuleKeys((prev) => (
                                                        prev.filter((key) => key !== record.key)
                                                    ));
                                                }
                                            }}
                                        >
                                            <Select.Option value={QualityRequirementAttributeComparator.EXACT}>
                                                Exact
                                            </Select.Option>
                                            <Select.Option value={QualityRequirementAttributeComparator.LEVENSHTEIN}>
                                                Levenshtein
                                            </Select.Option>
                                        </Select>
                                    </Form.Item>
                                ),
                            }, {
                                title: 'Actions',
                                dataIndex: 'actions',
                                render: (_: unknown, record: AttributeRuleRow): JSX.Element => {
                                    if (parentRequirementId !== null && !record.isLocal) {
                                        return <Text type='secondary'>Inherited</Text>;
                                    }

                                    if (parentRequirementId !== null && record.hasInheritedCounterpart) {
                                        return (
                                            <CVATTooltip title='Revert to inherited value'>
                                                <Button
                                                    type='text'
                                                    className='cvat-quality-requirements-action-button'
                                                    size='small'
                                                    icon={<UndoOutlined />}
                                                    disabled={formDisabled}
                                                    onClick={() => onRevertAttributeRule(record.index)}
                                                />
                                            </CVATTooltip>
                                        );
                                    }

                                    return (
                                        <CVATTooltip title='Delete rule'>
                                            <Button
                                                type='text'
                                                className='cvat-quality-requirements-action-button'
                                                size='small'
                                                icon={<DeleteOutlined />}
                                                disabled={formDisabled}
                                                onClick={() => {
                                                    remove(record.fieldName);
                                                    syncAttributeComparisonState(
                                                        (form.getFieldValue('attributeRules') ?? []) as AttributeRuleFormValue[],
                                                        form.getFieldValue('matchUnspecifiedAttributes') ?? false,
                                                    );
                                                }}
                                            />
                                        </CVATTooltip>
                                    );
                                },
                            }]}
                            dataSource={data}
                            size='small'
                            pagination={false}
                            expandable={{
                                expandedRowKeys: expandedAttributeRuleKeys,
                                rowExpandable: (record: AttributeRuleRow) => (
                                    record.comparator === QualityRequirementAttributeComparator.LEVENSHTEIN
                                ),
                                onExpandedRowsChange: (keys) => setExpandedAttributeRuleKeys([...keys]),
                                expandedRowRender: (record: AttributeRuleRow): JSX.Element => (
                                    <Row className='cvat-quality-requirement-attribute-rule-threshold-row'>
                                        <Col>
                                            <Form.Item
                                                name={[record.fieldName, 'threshold']}
                                                label={(
                                                    <Space>
                                                        <Text>Threshold</Text>
                                                        <CVATTooltip title='Minimum normalized similarity for Levenshtein comparator. Value must be from 0 to 1.'>
                                                            <QuestionCircleOutlined className='cvat-quality-settings-tooltip-icon' />
                                                        </CVATTooltip>
                                                    </Space>
                                                )}
                                                rules={[{
                                                    validator: (
                                                        _,
                                                        value: number | null | undefined,
                                                    ): Promise<void> => {
                                                        if (value === null || typeof value === 'undefined') {
                                                            return Promise.resolve();
                                                        }

                                                        return value >= 0 && value <= 1 ?
                                                            Promise.resolve() :
                                                            Promise.reject(new Error('Value must be from 0 to 1'));
                                                    },
                                                }]}
                                            >
                                                <InputNumber
                                                    min={0}
                                                    max={1}
                                                    step={0.1}
                                                    precision={2}
                                                    disabled={formDisabled}
                                                    className='cvat-quality-requirement-form-short-input'
                                                    onChange={() => markAttributeRuleChanged(record.index)}
                                                />
                                            </Form.Item>
                                        </Col>
                                    </Row>
                                ),
                            }}
                            locale={{ emptyText: 'No attribute rules configured' }}
                        />
                    );
                }}
            </Form.List>
        </>
    );
}
