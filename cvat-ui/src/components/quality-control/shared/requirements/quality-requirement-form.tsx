// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useMemo, useState } from 'react';
import { QuestionCircleOutlined, UndoOutlined } from '@ant-design/icons';
import Button from 'antd/lib/button';
import Checkbox from 'antd/lib/checkbox';
import Divider from 'antd/lib/divider';
import Form from 'antd/lib/form';
import Input from 'antd/lib/input';
import InputNumber from 'antd/lib/input-number';
import notification from 'antd/lib/notification';
import { Col, Row } from 'antd/lib/grid';
import Select from 'antd/lib/select';
import Space from 'antd/lib/space';
import Text from 'antd/lib/typography/Text';
import CVATTooltip from 'components/common/cvat-tooltip';
import { QualityRequirement } from 'cvat-core-wrapper';
import {
    QualityRequirementAnnotationType, QualityRequirementPointSizeBase,
} from 'cvat-core/src/quality/server-response-types';
import {
    ANNOTATION_TYPES,
    formatAnnotationType,
    formatMetric,
} from './quality-requirements-utils';
import QualityRequirementFilter from './quality-requirement-filter';
import QualityRequirementAttributeRules from './quality-requirement-attribute-rules';
import {
    AttributeRuleFormValue,
    buildAttributeOptions,
    buildParentOptions,
    formatDescription,
    getAncestorFilters,
    getChangedFieldNames,
    getCopiedInitialValues,
    getCopiedTouchedFields,
    getInitialValues,
    getPointSizeBaseDescription,
    hasLocalInheritedField,
    IOU_ANNOTATION_TYPES,
    METRIC_OPTIONS,
    OverridableFormFieldName,
    OVERRIDABLE_FORM_FIELDS,
    POINT_ANNOTATION_TYPES,
    POINT_SIZE_BASE_OPTIONS,
    QualityRequirementFormProps,
    removeInheritedFields,
    RequirementFormValues,
    SEGMENTATION_ANNOTATION_TYPES,
    serializeRequirementValues,
    validateJsonLogic,
} from './quality-requirement-form-utils';

export default function QualityRequirementForm(props: Readonly<QualityRequirementFormProps>): JSX.Element {
    const {
        settings,
        labels,
        requirement,
        parentRequirement,
        copiedRequirement,
        disabled,
        onCancel,
        onReload,
    } = props;

    const [form] = Form.useForm<RequirementFormValues>();
    const [submitting, setSubmitting] = useState(false);
    const [touchedFields, setTouchedFields] = useState<Set<string>>(() => getCopiedTouchedFields(copiedRequirement));
    const [resetFields, setResetFields] = useState<Set<string>>(new Set());
    const initialValues = useMemo(
        () => (
            copiedRequirement ?
                getCopiedInitialValues(copiedRequirement, parentRequirement, settings.requirements) :
                getInitialValues(requirement, parentRequirement, settings.requirements)
        ),
        [copiedRequirement, requirement, parentRequirement, settings.requirements],
    );
    const parentOptions = useMemo(
        () => buildParentOptions(settings.requirements, requirement),
        [settings.requirements, requirement],
    );
    const watchedAnnotationType = Form.useWatch('annotationType', form);
    const watchedParentRequirement = Form.useWatch('parentRequirement', form);
    const attributeOptions = useMemo(() => buildAttributeOptions(labels), [labels]);
    const attributeOptionsBySpecId = useMemo(() => (
        new Map(attributeOptions.map((option) => [option.value, option]))
    ), [attributeOptions]);
    const annotationType = (
        watchedAnnotationType ??
        form.getFieldValue('annotationType') ??
        initialValues.annotationType
    ) as QualityRequirementAnnotationType;
    const rawParentRequirementId = typeof watchedParentRequirement !== 'undefined' ?
        watchedParentRequirement :
        form.getFieldValue('parentRequirement');
    const parentRequirementId = typeof rawParentRequirementId !== 'undefined' ?
        rawParentRequirementId ?? null :
        initialValues.parentRequirement ?? null;
    const selectedParentRequirement = settings.requirements.find((item) => item.id === parentRequirementId) ?? null;
    const parentFilters = useMemo(
        () => getAncestorFilters(selectedParentRequirement, settings.requirements),
        [selectedParentRequirement, settings.requirements],
    );
    const watchedMatchUnspecifiedAttributes = Form.useWatch('matchUnspecifiedAttributes', form);
    const inheritedAttributeComparisonValues = useMemo(
        () => getInitialValues(null, selectedParentRequirement, settings.requirements),
        [selectedParentRequirement, settings.requirements],
    );
    const inheritedAttributeRuleSpecIds = useMemo(() => new Set(
        inheritedAttributeComparisonValues.attributeRules
            .map((rule) => rule.specId)
            .filter((specId): specId is number => typeof specId === 'number'),
    ), [inheritedAttributeComparisonValues]);
    const matchUnspecifiedOverridden = parentRequirementId !== null && (
        (watchedMatchUnspecifiedAttributes ??
            form.getFieldValue('matchUnspecifiedAttributes') ??
            false) !== inheritedAttributeComparisonValues.matchUnspecifiedAttributes
    );
    const formDisabled = disabled || submitting;
    const isBaseRequirement = !!requirement?.isBase;
    const parentRequirementRequired = !isBaseRequirement;
    const { requirementDescriptions } = settings;
    const overriddenFields = useMemo(() => {
        const next = new Set<string>();
        if (parentRequirementId === null) {
            return next;
        }

        for (const fieldName of OVERRIDABLE_FORM_FIELDS) {
            if (resetFields.has(fieldName)) {
                continue;
            }

            if (
                touchedFields.has(fieldName) ||
                (requirement && hasLocalInheritedField(requirement, fieldName))
            ) {
                next.add(fieldName);
            }
        }

        return next;
    }, [parentRequirementId, requirement, resetFields, touchedFields]);
    const attributeComparisonOverridden = parentRequirementId !== null && !resetFields.has('attributeComparison') && (
        touchedFields.has('attributeComparison') ||
        (!!requirement && hasLocalInheritedField(requirement, 'attributeComparison'))
    );

    const makeTooltipFragment = (metric: string, description: string): JSX.Element | null => {
        const formattedDescription = formatDescription(description);
        if (!formattedDescription) {
            return null;
        }

        return (
            <div>
                <Text strong>{`${metric}:`}</Text>
                <Text>
                    {formattedDescription}
                </Text>
            </div>
        );
    };

    const makeTooltip = (fragments: (JSX.Element | null)[]): JSX.Element => (
        <div className='cvat-settings-tooltip-inner'>
            {fragments}
        </div>
    );

    const shapeComparisonTooltip = makeTooltip([
        IOU_ANNOTATION_TYPES.has(annotationType) && makeTooltipFragment(
            'Min overlap threshold (IoU)',
            requirementDescriptions.iouThreshold,
        ),
        POINT_ANNOTATION_TYPES.has(annotationType) && makeTooltipFragment(
            'Object Keypoint Similarity (OKS)',
            requirementDescriptions.pointSize,
        ),
        POINT_ANNOTATION_TYPES.has(annotationType) && makeTooltipFragment(
            'Point size base',
            getPointSizeBaseDescription(requirementDescriptions.pointSizeBase),
        ),
        annotationType === 'polyline' && makeTooltipFragment(
            'Line thickness',
            requirementDescriptions.lineThickness,
        ),
        annotationType === 'polyline' && makeTooltipFragment(
            'Check orientation',
            requirementDescriptions.matchOrientation,
        ),
        annotationType === 'polyline' && makeTooltipFragment(
            'Min similarity gain',
            requirementDescriptions.lineOrientationThreshold,
        ),
        SEGMENTATION_ANNOTATION_TYPES.has(annotationType) && makeTooltipFragment(
            'Check object visibility',
            requirementDescriptions.checkCoveredAnnotations,
        ),
        SEGMENTATION_ANNOTATION_TYPES.has(annotationType) && makeTooltipFragment(
            'Min visibility threshold',
            requirementDescriptions.objectVisibilityThreshold,
        ),
        SEGMENTATION_ANNOTATION_TYPES.has(annotationType) && makeTooltipFragment(
            'Match only visible parts',
            requirementDescriptions.panopticComparison,
        ),
        makeTooltipFragment(
            'Compare groups',
            requirementDescriptions.matchGroups,
        ),
        makeTooltipFragment(
            'Min group match threshold',
            requirementDescriptions.groupMatchThreshold,
        ),
        makeTooltipFragment(
            'Empty frames are annotated',
            requirementDescriptions.emptyIsAnnotated,
        ),
    ]);

    const markTouchedFields = (changedValues: Partial<RequirementFormValues>): void => {
        const changedFieldNames = getChangedFieldNames(changedValues);
        setTouchedFields((prev) => {
            const next = new Set(prev);
            for (const fieldName of changedFieldNames) {
                next.add(fieldName);
            }

            return next;
        });
        setResetFields((prev) => {
            const next = new Set(prev);
            for (const fieldName of changedFieldNames) {
                next.delete(fieldName);
            }

            return next;
        });
    };

    const onParentChange = (value: number | null): void => {
        const nextParent = settings.requirements.find((item) => item.id === value) ?? null;
        if (nextParent) {
            form.setFieldsValue({
                ...getInitialValues(null, nextParent, settings.requirements),
                name: form.getFieldValue('name'),
                parentRequirement: value,
                filter: form.getFieldValue('filter'),
                enabled: form.getFieldValue('enabled'),
            });
            setTouchedFields(removeInheritedFields);
            setResetFields(removeInheritedFields);
        }
    };

    const onSubmit = async (values: RequirementFormValues): Promise<void> => {
        try {
            setSubmitting(true);
            const fields = serializeRequirementValues(values, settings, requirement, touchedFields, resetFields);
            if (requirement) {
                await requirement.save(fields);
            } else {
                await QualityRequirement.create(fields);
            }

            await onReload();
            notification.info({
                message: requirement ? 'Requirement has been updated' : 'Requirement has been created',
            });
            onCancel();
        } catch (error: unknown) {
            notification.error({
                message: requirement ? 'Could not update requirement' : 'Could not create requirement',
                description: error instanceof Error ? error.message : '',
            });
            throw error;
        } finally {
            setSubmitting(false);
        }
    };

    const getInheritedFormValue = (
        fieldName: OverridableFormFieldName,
    ): RequirementFormValues[OverridableFormFieldName] => {
        const inheritedValues = getInitialValues(null, selectedParentRequirement, settings.requirements);
        return inheritedValues[fieldName];
    };

    const onRevertInheritedField = (fieldName: OverridableFormFieldName): void => {
        const inheritedValue = getInheritedFormValue(fieldName);
        form.setFieldsValue({
            [fieldName]: inheritedValue,
        });
        setTouchedFields((prev) => {
            const next = new Set(prev);
            next.delete(fieldName);
            return next;
        });
        setResetFields((prev) => {
            const next = new Set(prev);
            if (requirement && hasLocalInheritedField(requirement, fieldName)) {
                next.add(fieldName);
            } else {
                next.delete(fieldName);
            }
            return next;
        });
    };

    // Recompute the section-level touched/reset state from whatever is still locally overridden,
    // so the serialized payload (and the section Undo) stays correct after partial reverts:
    // any remaining local rule or a checkbox differing from the parent keeps the override; once
    // nothing local remains we clear it, sending an explicit null only when the saved requirement
    // currently holds its own attribute comparison.
    const syncAttributeComparisonState = (
        nextRules: AttributeRuleFormValue[],
        nextMatchUnspecified: boolean,
    ): void => {
        const anyLocal = nextRules.some((rule) => rule.isLocal) ||
            nextMatchUnspecified !== inheritedAttributeComparisonValues.matchUnspecifiedAttributes;

        setTouchedFields((prev) => {
            const next = new Set(prev);
            if (anyLocal) {
                next.add('attributeComparison');
            } else {
                next.delete('attributeComparison');
            }
            return next;
        });
        setResetFields((prev) => {
            const next = new Set(prev);
            if (!anyLocal && requirement && hasLocalInheritedField(requirement, 'attributeComparison')) {
                next.add('attributeComparison');
            } else {
                next.delete('attributeComparison');
            }
            return next;
        });
    };

    const onRevertAttributeComparison = (): void => {
        form.setFieldsValue({
            matchUnspecifiedAttributes: inheritedAttributeComparisonValues.matchUnspecifiedAttributes,
            attributeRules: inheritedAttributeComparisonValues.attributeRules,
        });
        syncAttributeComparisonState(
            inheritedAttributeComparisonValues.attributeRules,
            inheritedAttributeComparisonValues.matchUnspecifiedAttributes,
        );
    };

    const onRevertAttributeRule = (index: number): void => {
        const currentRules = [...(form.getFieldValue('attributeRules') ?? [])] as AttributeRuleFormValue[];
        const rule = currentRules[index];
        if (!rule) {
            return;
        }

        const inheritedRule = inheritedAttributeComparisonValues.attributeRules
            .find((candidate) => candidate.specId === rule.specId);
        if (!inheritedRule) {
            return;
        }

        currentRules[index] = { ...inheritedRule };
        form.setFieldsValue({ attributeRules: currentRules });
        syncAttributeComparisonState(currentRules, form.getFieldValue('matchUnspecifiedAttributes') ?? false);
    };

    const onRevertMatchUnspecified = (): void => {
        const nextMatchUnspecified = inheritedAttributeComparisonValues.matchUnspecifiedAttributes;
        form.setFieldsValue({ matchUnspecifiedAttributes: nextMatchUnspecified });
        syncAttributeComparisonState(
            (form.getFieldValue('attributeRules') ?? []) as AttributeRuleFormValue[],
            nextMatchUnspecified,
        );
    };

    const setAttributeRuleLocal = (index: number): void => {
        const rules = [...(form.getFieldValue('attributeRules') ?? [])];
        if (rules[index]) {
            rules[index] = {
                ...rules[index],
                isLocal: true,
            };
            form.setFieldsValue({ attributeRules: rules });
        }
    };

    const markAttributeRuleChanged = (index: number): void => {
        setAttributeRuleLocal(index);
        markTouchedFields({ attributeRules: form.getFieldValue('attributeRules') ?? [] });
    };

    const renderOverrideControl = (
        fieldName: OverridableFormFieldName,
        label: string,
    ): JSX.Element => {
        const isOverridden = overriddenFields.has(fieldName);
        if (!isOverridden) {
            return <>{label}</>;
        }

        return (
            <Space size={4} className='cvat-quality-requirement-overridden-label'>
                <span>{label}</span>
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
                            onRevertInheritedField(fieldName);
                        }}
                    />
                </CVATTooltip>
            </Space>
        );
    };

    const renderCheckbox = (
        name: OverridableFormFieldName,
        label: string,
    ): JSX.Element => (
        <Form.Item name={name} valuePropName='checked'>
            <Checkbox>
                {renderOverrideControl(name, label)}
            </Checkbox>
        </Form.Item>
    );

    const renderPercentInput = (
        name: OverridableFormFieldName,
        label: string,
    ): JSX.Element => (
        <Form.Item
            name={name}
            label={renderOverrideControl(name, label)}
            rules={[
                { required: true, message: 'This field is required' },
                {
                    validator: (_, value: number | null | undefined): Promise<void> => {
                        if (value === null || typeof value === 'undefined') {
                            return Promise.resolve();
                        }

                        return value >= 0 && value <= 100 ?
                            Promise.resolve() :
                            Promise.reject(new Error('Value must be from 0 to 100'));
                    },
                },
            ]}
        >
            <InputNumber
                min={0}
                max={100}
                precision={0}
                className='cvat-quality-requirement-form-short-input'
            />
        </Form.Item>
    );

    const renderShapeComparison = (): JSX.Element | null => {
        if (annotationType === QualityRequirementAnnotationType.TAG) {
            return null;
        }

        return (
            <>
                <Divider />
                <Row className='cvat-quality-requirement-form-section-title'>
                    <Text strong>Shape comparison</Text>
                    <CVATTooltip
                        title={shapeComparisonTooltip}
                        className='cvat-settings-tooltip'
                        overlayStyle={{ maxWidth: '500px' }}
                    >
                        <QuestionCircleOutlined className='cvat-quality-settings-tooltip-icon' />
                    </CVATTooltip>
                </Row>
                <Row gutter={16}>
                    {IOU_ANNOTATION_TYPES.has(annotationType) && (
                        <Col span={12}>
                            {renderPercentInput('iouThreshold', 'IoU threshold (%)')}
                        </Col>
                    )}
                    {POINT_ANNOTATION_TYPES.has(annotationType) && (
                        <>
                            <Col span={12}>
                                {renderPercentInput('pointSize', 'Point size (%)')}
                            </Col>
                            <Col span={12}>
                                <Form.Item
                                    name='pointSizeBase'
                                    label={renderOverrideControl('pointSizeBase', 'Point size base')}
                                >
                                    <Select>
                                        {POINT_SIZE_BASE_OPTIONS.map((value) => (
                                            <Select.Option key={value} value={value}>
                                                {value === QualityRequirementPointSizeBase.GROUP_BBOX_SIZE ? (
                                                    'Group bbox size'
                                                ) : (
                                                    'Image size'
                                                )}
                                            </Select.Option>
                                        ))}
                                    </Select>
                                </Form.Item>
                            </Col>
                        </>
                    )}
                    {annotationType === 'polyline' && (
                        <>
                            <Col span={12}>
                                {renderPercentInput('lineThickness', 'Line thickness (%)')}
                            </Col>
                            <Col span={12}>
                                {renderPercentInput(
                                    'lineOrientationThreshold',
                                    'Line orientation threshold (%)',
                                )}
                            </Col>
                            <Col span={12}>
                                {renderCheckbox('matchOrientation', 'Match orientation')}
                            </Col>
                        </>
                    )}
                    {SEGMENTATION_ANNOTATION_TYPES.has(annotationType) && (
                        <>
                            <Col span={12}>
                                {renderPercentInput(
                                    'objectVisibilityThreshold',
                                    'Object visibility threshold (%)',
                                )}
                            </Col>
                            <Col span={12}>
                                {renderCheckbox('checkCoveredAnnotations', 'Check covered annotations')}
                            </Col>
                            <Col span={12}>
                                {renderCheckbox('panopticComparison', 'Panoptic comparison')}
                            </Col>
                        </>
                    )}
                    <Col span={12}>
                        {renderPercentInput(
                            'groupMatchThreshold',
                            'Min group match threshold (%)',
                        )}
                    </Col>
                    <Col span={12}>
                        {renderCheckbox('matchGroups', 'Match groups')}
                    </Col>
                    <Col span={12}>
                        {renderCheckbox('emptyIsAnnotated', 'Empty frames are annotated')}
                    </Col>
                </Row>
            </>
        );
    };

    return (
        <Form
            form={form}
            layout='vertical'
            initialValues={initialValues}
            disabled={formDisabled}
            className='cvat-quality-requirement-form'
            onValuesChange={markTouchedFields}
            onFinish={onSubmit}
        >
            <Row justify='end' className='cvat-quality-settings-save-btn cvat-quality-requirement-form-actions'>
                <Col>
                    <Space>
                        <Button onClick={onCancel} disabled={submitting}>Cancel</Button>
                        <Button type='primary' htmlType='submit' loading={submitting}>Save</Button>
                    </Space>
                </Col>
            </Row>
            <Row className='cvat-quality-requirement-form-header' align='middle'>
                <Col>
                    <Text strong>{requirement ? 'Edit requirement' : 'Create requirement'}</Text>
                </Col>
            </Row>
            <Form.Item
                name='name'
                label='Name'
                rules={[{
                    required: true,
                    message: 'This field is required',
                }, {
                    max: 250,
                    message: 'Name must be at most 250 characters',
                }, {
                    validator: (_, value: string): Promise<void> => {
                        const trimmedValue = value?.trim();
                        const duplicate = settings.requirements.find((item) => (
                            item.name === trimmedValue && item.id !== requirement?.id
                        ));

                        return duplicate ?
                            Promise.reject(new Error('Requirement name must be unique')) :
                            Promise.resolve();
                    },
                }]}
            >
                <Input placeholder='Sample requirement name' />
            </Form.Item>
            <Form.Item
                name='parentRequirement'
                label='Parent requirement'
                rules={[
                    ...(parentRequirementRequired ? [{
                        required: true,
                        message: 'This field is required',
                    }] : []),
                ]}
            >
                <Select
                    disabled
                    placeholder='Parent requirement'
                    onChange={(value: number | null) => {
                        const nextValue = value ?? null;
                        form.setFieldsValue({ parentRequirement: nextValue });
                        onParentChange(nextValue);
                    }}
                >
                    {parentOptions.map((option) => (
                        <Select.Option key={option.value} value={option.value}>
                            {option.label}
                        </Select.Option>
                    ))}
                </Select>
            </Form.Item>
            <Row gutter={16}>
                <Col span={12}>
                    <Form.Item
                        name='annotationType'
                        label='Target'
                        rules={[{ required: true, message: 'This field is required' }]}
                    >
                        <Select disabled>
                            {ANNOTATION_TYPES.map((value) => (
                                <Select.Option key={value} value={value}>
                                    {formatAnnotationType(value)}
                                </Select.Option>
                            ))}
                        </Select>
                    </Form.Item>
                </Col>
                <Col span={12}>
                    <Form.Item
                        label='Filter'
                    >
                        <div className='cvat-quality-requirement-filter-control'>
                            <Form.Item
                                name='filter'
                                rules={[{ validator: validateJsonLogic }]}
                                noStyle
                            >
                                <QualityRequirementFilter
                                    labels={labels}
                                    parentFilters={parentFilters}
                                    disabled={disabled}
                                />
                            </Form.Item>
                            <Form.Item shouldUpdate noStyle>
                                {(): JSX.Element => (
                                    <Button
                                        className='cvat-clear-filters-button'
                                        disabled={!form.getFieldValue('filter') || disabled}
                                        size='small'
                                        type='link'
                                        onClick={() => {
                                            form.setFieldsValue({ filter: '' });
                                            markTouchedFields({ filter: '' });
                                        }}
                                    >
                                        Clear filters
                                    </Button>
                                )}
                            </Form.Item>
                        </div>
                    </Form.Item>
                </Col>
                <Col span={12}>
                    <Form.Item
                        name='metric'
                        label={renderOverrideControl('metric', 'Target metric')}
                        rules={[{ required: true, message: 'This field is required' }]}
                    >
                        <Select>
                            {METRIC_OPTIONS.map((value) => (
                                <Select.Option key={value} value={value}>
                                    {formatMetric(value)}
                                </Select.Option>
                            ))}
                        </Select>
                    </Form.Item>
                </Col>
                <Col span={12}>
                    {renderPercentInput('requiredScore', 'Target metric threshold (%)')}
                </Col>
                <Col span={12}>
                    <Form.Item name='enabled' valuePropName='checked'>
                        <Checkbox>Enabled</Checkbox>
                    </Form.Item>
                </Col>
            </Row>
            {renderShapeComparison()}
            <QualityRequirementAttributeRules
                form={form}
                settingsId={settings.id}
                attributeComparisonDescription={requirementDescriptions.attributeComparison}
                attributeComparisonOverridden={attributeComparisonOverridden}
                attributeOptions={attributeOptions}
                attributeOptionsBySpecId={attributeOptionsBySpecId}
                formDisabled={formDisabled}
                inheritedAttributeRuleSpecIds={inheritedAttributeRuleSpecIds}
                matchUnspecifiedOverridden={matchUnspecifiedOverridden}
                parentRequirementId={parentRequirementId}
                markAttributeRuleChanged={markAttributeRuleChanged}
                markTouchedFields={markTouchedFields}
                onRevertAttributeComparison={onRevertAttributeComparison}
                onRevertAttributeRule={onRevertAttributeRule}
                onRevertMatchUnspecified={onRevertMatchUnspecified}
                syncAttributeComparisonState={syncAttributeComparisonState}
            />
        </Form>
    );
}
