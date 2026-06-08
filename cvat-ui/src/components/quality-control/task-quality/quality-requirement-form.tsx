// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useMemo, useState } from 'react';
import {
    QuestionCircleOutlined,
    UndoOutlined,
} from '@ant-design/icons';
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
import {
    getCore,
    Label,
    QualityRequirement,
    QualitySettings,
} from 'cvat-core-wrapper';
import {
    QualityRequirementAnnotationType,
    QualityRequirementMetric,
    QualityRequirementPointSizeBase,
    SerializedQualityRequirementAttributeComparison,
    SerializedQualityRequirementData,
} from 'cvat-core/src/server-response-types';
import {
    ANNOTATION_TYPES,
    buildRequirementsById,
    formatAnnotationType,
    formatMetric,
    getRequirementEffectiveField,
    getRequirementResolvedValue,
} from './quality-requirements-utils';
import QualityRequirementFilter from './quality-requirement-filter';

const core = getCore();

const ROOT_DEFAULTS = {
    annotationType: 'rectangle' as QualityRequirementAnnotationType,
    metric: 'accuracy' as QualityRequirementMetric,
    requiredScore: 70,
    iouThreshold: 40,
    pointSize: 9,
    pointSizeBase: 'group_bbox_size' as QualityRequirementPointSizeBase,
    lineThickness: 1,
    matchOrientation: true,
    lineOrientationThreshold: 10,
    matchGroups: true,
    groupMatchThreshold: 50,
    checkCoveredAnnotations: true,
    objectVisibilityThreshold: 5,
    panopticComparison: true,
    emptyIsAnnotated: false,
};

const METRIC_OPTIONS: QualityRequirementMetric[] = ['accuracy', 'precision', 'recall'];
const POINT_SIZE_BASE_OPTIONS: QualityRequirementPointSizeBase[] = ['group_bbox_size', 'image_size'];
const IOU_ANNOTATION_TYPES = new Set<QualityRequirementAnnotationType>([
    'rectangle',
    'ellipse',
    'polygon',
    'mask',
    'polyline',
]);
const POINT_ANNOTATION_TYPES = new Set<QualityRequirementAnnotationType>([
    'points',
    'skeleton',
    'skeleton_keypoint',
]);
const SEGMENTATION_ANNOTATION_TYPES = new Set<QualityRequirementAnnotationType>([
    'polygon',
    'mask',
]);
type InheritedFormFieldName =
    'annotationType' |
    'metric' |
    'requiredScore' |
    'iouThreshold' |
    'pointSize' |
    'pointSizeBase' |
    'lineThickness' |
    'matchOrientation' |
    'lineOrientationThreshold' |
    'matchGroups' |
    'groupMatchThreshold' |
    'checkCoveredAnnotations' |
    'objectVisibilityThreshold' |
    'panopticComparison' |
    'emptyIsAnnotated' |
    'attributeComparison';

type OverridableFormFieldName = Exclude<InheritedFormFieldName, 'annotationType' | 'attributeComparison'>;

const INHERITED_FORM_FIELDS = new Set<InheritedFormFieldName>([
    'annotationType',
    'metric',
    'requiredScore',
    'iouThreshold',
    'pointSize',
    'pointSizeBase',
    'lineThickness',
    'matchOrientation',
    'lineOrientationThreshold',
    'matchGroups',
    'groupMatchThreshold',
    'checkCoveredAnnotations',
    'objectVisibilityThreshold',
    'panopticComparison',
    'emptyIsAnnotated',
    'attributeComparison',
]);

const OVERRIDABLE_FORM_FIELDS: OverridableFormFieldName[] = [
    'metric',
    'requiredScore',
    'iouThreshold',
    'pointSize',
    'pointSizeBase',
    'lineThickness',
    'matchOrientation',
    'lineOrientationThreshold',
    'matchGroups',
    'groupMatchThreshold',
    'checkCoveredAnnotations',
    'objectVisibilityThreshold',
    'panopticComparison',
    'emptyIsAnnotated',
];

const LOCAL_INHERITED_FIELD_GETTERS: Record<
    InheritedFormFieldName,
    (requirement: QualityRequirement) => unknown
> = {
    annotationType: (requirement: QualityRequirement) => requirement.annotationType,
    metric: (requirement: QualityRequirement) => requirement.metric,
    requiredScore: (requirement: QualityRequirement) => requirement.requiredScore,
    iouThreshold: (requirement: QualityRequirement) => requirement.iouThreshold,
    pointSize: (requirement: QualityRequirement) => requirement.pointSize,
    pointSizeBase: (requirement: QualityRequirement) => requirement.pointSizeBase,
    lineThickness: (requirement: QualityRequirement) => requirement.lineThickness,
    matchOrientation: (requirement: QualityRequirement) => requirement.matchOrientation,
    lineOrientationThreshold: (requirement: QualityRequirement) => requirement.lineOrientationThreshold,
    matchGroups: (requirement: QualityRequirement) => requirement.matchGroups,
    groupMatchThreshold: (requirement: QualityRequirement) => requirement.groupMatchThreshold,
    checkCoveredAnnotations: (requirement: QualityRequirement) => requirement.checkCoveredAnnotations,
    objectVisibilityThreshold: (requirement: QualityRequirement) => requirement.objectVisibilityThreshold,
    panopticComparison: (requirement: QualityRequirement) => requirement.panopticComparison,
    emptyIsAnnotated: (requirement: QualityRequirement) => requirement.emptyIsAnnotated,
    attributeComparison: (requirement: QualityRequirement) => requirement.attributeComparison,
};

interface AttributeRuleFormValue {
    specId?: number;
    enabled?: boolean;
    comparator?: 'exact' | 'levenshtein';
    threshold?: number | null;
}

interface RequirementFormValues {
    name: string;
    parentRequirement?: number | null;
    annotationType: QualityRequirementAnnotationType;
    metric: QualityRequirementMetric;
    requiredScore: number;
    filter?: string;
    enabled: boolean;
    iouThreshold?: number | null;
    pointSize?: number | null;
    pointSizeBase?: QualityRequirementPointSizeBase | null;
    lineThickness?: number | null;
    matchOrientation?: boolean | null;
    lineOrientationThreshold?: number | null;
    matchGroups?: boolean | null;
    groupMatchThreshold?: number | null;
    checkCoveredAnnotations?: boolean | null;
    objectVisibilityThreshold?: number | null;
    panopticComparison?: boolean | null;
    emptyIsAnnotated?: boolean | null;
    matchUnspecifiedAttributes?: boolean;
    attributeRules?: AttributeRuleFormValue[];
}

interface Props {
    settings: QualitySettings;
    labels: Label[];
    requirement: QualityRequirement | null;
    parentRequirement: QualityRequirement | null;
    disabled: boolean;
    onCancel: () => void;
    onReload: () => Promise<void>;
}

interface SerializedInheritedFieldDescriptor {
    fieldName: InheritedFormFieldName;
    serializedFieldName: keyof SerializedQualityRequirementData;
    getValue: (values: RequirementFormValues, isRootRequirement: boolean) => unknown;
}

function toPercent(value: number | null | undefined): number | undefined {
    return typeof value === 'number' ? Number((value * 100).toFixed(4)) : undefined;
}

function fromPercent(value: number | null | undefined): number | null {
    return typeof value === 'number' ? Number((value / 100).toFixed(6)) : null;
}

function getAnnotationType(
    requirement: QualityRequirement | null,
    requirementsById: Map<number, QualityRequirement>,
): QualityRequirementAnnotationType {
    return getRequirementResolvedValue(
        requirement,
        requirementsById,
        (item: QualityRequirement) => item.annotationType,
        (item: QualityRequirement) => getRequirementEffectiveField(item, 'annotationType'),
        ROOT_DEFAULTS.annotationType,
    );
}

function getMetric(
    requirement: QualityRequirement | null,
    requirementsById: Map<number, QualityRequirement>,
): QualityRequirementMetric {
    return getRequirementResolvedValue(
        requirement,
        requirementsById,
        (item: QualityRequirement) => item.metric,
        (item: QualityRequirement) => getRequirementEffectiveField(item, 'metric'),
        ROOT_DEFAULTS.metric,
    );
}

function getNumberPercentValue(
    requirement: QualityRequirement | null,
    requirementsById: Map<number, QualityRequirement>,
    getLocalValue: (item: QualityRequirement) => number | null | undefined,
    getEffectiveValue: (item: QualityRequirement) => number | null | undefined,
    defaultValue: number,
): number {
    return Math.round(
        toPercent(
            getRequirementResolvedValue(
                requirement, requirementsById, getLocalValue, getEffectiveValue, defaultValue / 100,
            ),
        ) ??
            defaultValue,
    );
}

function getBooleanValue(
    requirement: QualityRequirement | null,
    requirementsById: Map<number, QualityRequirement>,
    getLocalValue: (item: QualityRequirement) => boolean | null | undefined,
    getEffectiveValue: (item: QualityRequirement) => boolean | null | undefined,
    defaultValue: boolean,
): boolean {
    return getRequirementResolvedValue(requirement, requirementsById, getLocalValue, getEffectiveValue, defaultValue);
}

function formatDescription(description = ''): string {
    return description.replaceAll(/\s+/g, ' ').trim();
}

function getPointSizeBaseDescription(description = ''): string {
    const endIndex = description.indexOf('\n\n\n');
    const trimmedDescription = endIndex === -1 ? description : description.substring(0, endIndex);
    return formatDescription(trimmedDescription);
}

function getAttributeComparison(
    requirement: QualityRequirement | null,
    requirementsById: Map<number, QualityRequirement>,
): SerializedQualityRequirementAttributeComparison | null {
    return getRequirementResolvedValue(
        requirement,
        requirementsById,
        (item: QualityRequirement) => item.attributeComparison,
        (item: QualityRequirement) => item.effective?.attributeComparison,
        null,
    );
}

function getAttributeRuleSpecId(rule: Record<string, unknown>): number | undefined {
    const value = rule.spec_id ?? rule.specId;
    return typeof value === 'number' ? value : undefined;
}

function getInitialValues(
    requirement: QualityRequirement | null,
    parentRequirement: QualityRequirement | null,
    requirements: QualityRequirement[],
): RequirementFormValues {
    const sourceRequirement = requirement ?? parentRequirement;
    const requirementsById = buildRequirementsById(requirements);
    const attributeComparison = getAttributeComparison(sourceRequirement, requirementsById);

    return {
        name: requirement?.name ?? '',
        parentRequirement: requirement?.parentRequirementId ?? parentRequirement?.id ?? null,
        annotationType: getAnnotationType(sourceRequirement, requirementsById),
        metric: getMetric(sourceRequirement, requirementsById),
        requiredScore: getNumberPercentValue(
            sourceRequirement,
            requirementsById,
            (item: QualityRequirement) => item.requiredScore,
            (item: QualityRequirement) => getRequirementEffectiveField(item, 'requiredScore'),
            ROOT_DEFAULTS.requiredScore,
        ),
        filter: requirement?.filter ?? '',
        enabled: requirement?.enabled ?? true,
        iouThreshold: getNumberPercentValue(
            sourceRequirement,
            requirementsById,
            (item: QualityRequirement) => item.iouThreshold,
            (item: QualityRequirement) => getRequirementEffectiveField(item, 'iouThreshold'),
            ROOT_DEFAULTS.iouThreshold,
        ),
        pointSize: getNumberPercentValue(
            sourceRequirement,
            requirementsById,
            (item: QualityRequirement) => item.pointSize,
            (item: QualityRequirement) => getRequirementEffectiveField(item, 'pointSize'),
            ROOT_DEFAULTS.pointSize,
        ),
        pointSizeBase: getRequirementResolvedValue(
            sourceRequirement,
            requirementsById,
            (item: QualityRequirement) => item.pointSizeBase,
            (item: QualityRequirement) => getRequirementEffectiveField(item, 'pointSizeBase'),
            ROOT_DEFAULTS.pointSizeBase,
        ),
        lineThickness: getNumberPercentValue(
            sourceRequirement,
            requirementsById,
            (item: QualityRequirement) => item.lineThickness,
            (item: QualityRequirement) => getRequirementEffectiveField(item, 'lineThickness'),
            ROOT_DEFAULTS.lineThickness,
        ),
        matchOrientation: getBooleanValue(
            sourceRequirement,
            requirementsById,
            (item: QualityRequirement) => item.matchOrientation,
            (item: QualityRequirement) => getRequirementEffectiveField(item, 'matchOrientation'),
            ROOT_DEFAULTS.matchOrientation,
        ),
        lineOrientationThreshold: getNumberPercentValue(
            sourceRequirement,
            requirementsById,
            (item: QualityRequirement) => item.lineOrientationThreshold,
            (item: QualityRequirement) => getRequirementEffectiveField(item, 'lineOrientationThreshold'),
            ROOT_DEFAULTS.lineOrientationThreshold,
        ),
        matchGroups: getBooleanValue(
            sourceRequirement,
            requirementsById,
            (item: QualityRequirement) => item.matchGroups,
            (item: QualityRequirement) => getRequirementEffectiveField(item, 'matchGroups'),
            ROOT_DEFAULTS.matchGroups,
        ),
        groupMatchThreshold: getNumberPercentValue(
            sourceRequirement,
            requirementsById,
            (item: QualityRequirement) => item.groupMatchThreshold,
            (item: QualityRequirement) => getRequirementEffectiveField(item, 'groupMatchThreshold'),
            ROOT_DEFAULTS.groupMatchThreshold,
        ),
        checkCoveredAnnotations: getBooleanValue(
            sourceRequirement,
            requirementsById,
            (item: QualityRequirement) => item.checkCoveredAnnotations,
            (item: QualityRequirement) => getRequirementEffectiveField(item, 'checkCoveredAnnotations'),
            ROOT_DEFAULTS.checkCoveredAnnotations,
        ),
        objectVisibilityThreshold: getNumberPercentValue(
            sourceRequirement,
            requirementsById,
            (item: QualityRequirement) => item.objectVisibilityThreshold,
            (item: QualityRequirement) => getRequirementEffectiveField(item, 'objectVisibilityThreshold'),
            ROOT_DEFAULTS.objectVisibilityThreshold,
        ),
        panopticComparison: getBooleanValue(
            sourceRequirement,
            requirementsById,
            (item: QualityRequirement) => item.panopticComparison,
            (item: QualityRequirement) => getRequirementEffectiveField(item, 'panopticComparison'),
            ROOT_DEFAULTS.panopticComparison,
        ),
        emptyIsAnnotated: getBooleanValue(
            sourceRequirement,
            requirementsById,
            (item: QualityRequirement) => item.emptyIsAnnotated,
            (item: QualityRequirement) => getRequirementEffectiveField(item, 'emptyIsAnnotated'),
            ROOT_DEFAULTS.emptyIsAnnotated,
        ),
        matchUnspecifiedAttributes: attributeComparison?.default?.enabled ?? false,
        attributeRules: (attributeComparison?.rules ?? []).map((rule): AttributeRuleFormValue => {
            const ruleRecord = rule as unknown as Record<string, unknown>;
            return {
                specId: getAttributeRuleSpecId(ruleRecord),
                enabled: rule.enabled ?? true,
                comparator: rule.comparator ?? 'exact',
                threshold: toPercent(rule.threshold),
            };
        }),
    };
}

function buildDescendantIdSet(requirements: QualityRequirement[], requirement: QualityRequirement | null): Set<number> {
    const excludedIds = new Set<number>();
    if (typeof requirement?.id !== 'number') {
        return excludedIds;
    }

    excludedIds.add(requirement.id);
    let changed = true;
    while (changed) {
        changed = false;
        for (const candidate of requirements) {
            if (
                typeof candidate.id === 'number' &&
                typeof candidate.parentRequirementId === 'number' &&
                excludedIds.has(candidate.parentRequirementId) &&
                !excludedIds.has(candidate.id)
            ) {
                excludedIds.add(candidate.id);
                changed = true;
            }
        }
    }

    return excludedIds;
}

function buildParentOptions(
    requirements: QualityRequirement[],
    requirement: QualityRequirement | null,
): { value: number; label: string }[] {
    const excludedIds = buildDescendantIdSet(requirements, requirement);
    const childrenByParent = new Map<number | null, QualityRequirement[]>();
    const requirementIds = new Set(requirements
        .map((item) => item.id)
        .filter((id: number | undefined): id is number => typeof id === 'number'));

    for (const item of requirements) {
        if (typeof item.id !== 'number' || excludedIds.has(item.id)) {
            continue;
        }

        const parentId = item.parentRequirementId;
        const normalizedParentId = parentId !== null && requirementIds.has(parentId) ? parentId : null;
        const siblings = childrenByParent.get(normalizedParentId) ?? [];
        siblings.push(item);
        childrenByParent.set(normalizedParentId, siblings);
    }

    for (const siblings of childrenByParent.values()) {
        siblings.sort((first, second) => first.sortOrder - second.sortOrder || first.name.localeCompare(second.name));
    }

    const flatten = (parentId: number | null, depth: number): { value: number; label: string }[] => (
        (childrenByParent.get(parentId) ?? []).flatMap((item) => {
            const prefix = depth ? `${'- '.repeat(depth)}` : '';
            return [
                { value: item.id as number, label: `${prefix}${item.name}` },
                ...flatten(item.id as number, depth + 1),
            ];
        })
    );

    return flatten(null, 0);
}

function includeInheritedField(
    fieldName: InheritedFormFieldName,
    isRootRequirement: boolean,
    touchedFields: Set<string>,
): boolean {
    return isRootRequirement || touchedFields.has(fieldName);
}

function hasLocalInheritedField(requirement: QualityRequirement, fieldName: InheritedFormFieldName): boolean {
    const value = LOCAL_INHERITED_FIELD_GETTERS[fieldName](requirement);
    return value !== null && typeof value !== 'undefined';
}

function setResettableFieldValue(
    fields: SerializedQualityRequirementData,
    resetFields: Set<string>,
    fieldName: InheritedFormFieldName,
    serializedFieldName: keyof SerializedQualityRequirementData,
    value: unknown,
): void {
    (fields as Record<string, unknown>)[serializedFieldName] = resetFields.has(fieldName) ? null : value;
}

function buildAttributeComparison(
    values: RequirementFormValues,
    isRootRequirement: boolean,
): SerializedQualityRequirementAttributeComparison | null {
    const rules = (values.attributeRules ?? [])
        .filter((rule): rule is Required<Pick<AttributeRuleFormValue, 'specId'>> & AttributeRuleFormValue => (
            typeof rule.specId === 'number'
        ))
        .map((rule) => {
            const comparator = rule.comparator ?? 'exact';
            return {
                spec_id: rule.specId,
                enabled: rule.enabled ?? true,
                comparator,
                ...(comparator === 'levenshtein' && typeof rule.threshold === 'number' ? {
                    threshold: fromPercent(rule.threshold),
                } : {}),
            };
        });

    if (!values.matchUnspecifiedAttributes && !rules.length) {
        if (!isRootRequirement) {
            return { default: { enabled: false } };
        }

        return null;
    }

    return {
        default: {
            enabled: !!values.matchUnspecifiedAttributes,
            ...(values.matchUnspecifiedAttributes ? { comparator: 'exact' as const } : {}),
        },
        ...(rules.length ? { rules } : {}),
    };
}

const SERIALIZED_INHERITED_FIELD_DESCRIPTORS: SerializedInheritedFieldDescriptor[] = [{
    fieldName: 'metric',
    serializedFieldName: 'metric',
    getValue: (values: RequirementFormValues) => values.metric,
}, {
    fieldName: 'requiredScore',
    serializedFieldName: 'required_score',
    getValue: (values: RequirementFormValues) => fromPercent(values.requiredScore),
}, {
    fieldName: 'iouThreshold',
    serializedFieldName: 'iou_threshold',
    getValue: (values: RequirementFormValues) => fromPercent(values.iouThreshold),
}, {
    fieldName: 'pointSize',
    serializedFieldName: 'point_size',
    getValue: (values: RequirementFormValues) => fromPercent(values.pointSize),
}, {
    fieldName: 'pointSizeBase',
    serializedFieldName: 'point_size_base',
    getValue: (values: RequirementFormValues) => values.pointSizeBase ?? null,
}, {
    fieldName: 'lineThickness',
    serializedFieldName: 'line_thickness',
    getValue: (values: RequirementFormValues) => fromPercent(values.lineThickness),
}, {
    fieldName: 'matchOrientation',
    serializedFieldName: 'match_orientation',
    getValue: (values: RequirementFormValues) => values.matchOrientation ?? null,
}, {
    fieldName: 'lineOrientationThreshold',
    serializedFieldName: 'line_orientation_threshold',
    getValue: (values: RequirementFormValues) => fromPercent(values.lineOrientationThreshold),
}, {
    fieldName: 'matchGroups',
    serializedFieldName: 'match_groups',
    getValue: (values: RequirementFormValues) => values.matchGroups ?? null,
}, {
    fieldName: 'groupMatchThreshold',
    serializedFieldName: 'group_match_threshold',
    getValue: (values: RequirementFormValues) => fromPercent(values.groupMatchThreshold),
}, {
    fieldName: 'checkCoveredAnnotations',
    serializedFieldName: 'check_covered_annotations',
    getValue: (values: RequirementFormValues) => values.checkCoveredAnnotations ?? null,
}, {
    fieldName: 'objectVisibilityThreshold',
    serializedFieldName: 'object_visibility_threshold',
    getValue: (values: RequirementFormValues) => fromPercent(values.objectVisibilityThreshold),
}, {
    fieldName: 'panopticComparison',
    serializedFieldName: 'panoptic_comparison',
    getValue: (values: RequirementFormValues) => values.panopticComparison ?? null,
}, {
    fieldName: 'emptyIsAnnotated',
    serializedFieldName: 'empty_is_annotated',
    getValue: (values: RequirementFormValues) => values.emptyIsAnnotated ?? null,
}, {
    fieldName: 'attributeComparison',
    serializedFieldName: 'attribute_comparison',
    getValue: (values: RequirementFormValues, isRootRequirement: boolean) => (
        buildAttributeComparison(values, isRootRequirement)
    ),
}];

function serializeRequirementValues(
    values: RequirementFormValues,
    settings: QualitySettings,
    requirement: QualityRequirement | null,
    touchedFields: Set<string>,
    resetFields: Set<string>,
): SerializedQualityRequirementData {
    const parentRequirement = values.parentRequirement ?? null;
    const isRootRequirement = parentRequirement === null;
    const fields: SerializedQualityRequirementData = {
        name: values.name.trim(),
        parent_requirement: parentRequirement,
        filter: values.filter ?? '',
        enabled: values.enabled,
    };

    if (!requirement) {
        fields.settings_id = settings.id;
        fields.sort_order = Math.max(0, ...settings.requirements.map((item) => item.sortOrder)) + 1;
    }

    fields.annotation_type = isRootRequirement ? values.annotationType : null;

    const includeInheritedOrResetField = (fieldName: InheritedFormFieldName): boolean => (
        includeInheritedField(fieldName, isRootRequirement, touchedFields) || resetFields.has(fieldName)
    );

    for (const descriptor of SERIALIZED_INHERITED_FIELD_DESCRIPTORS) {
        if (!includeInheritedOrResetField(descriptor.fieldName)) {
            continue;
        }

        setResettableFieldValue(
            fields,
            resetFields,
            descriptor.fieldName,
            descriptor.serializedFieldName,
            descriptor.getValue(values, isRootRequirement),
        );
    }

    return fields;
}

function validateJsonLogic(_: unknown, value: string | undefined): Promise<void> {
    if (!value) {
        return Promise.resolve();
    }

    try {
        const parsedValue = JSON.parse(value);
        if (!parsedValue || Array.isArray(parsedValue) || typeof parsedValue !== 'object') {
            return Promise.reject(new Error('Filter must be a JSON logic object'));
        }

        return Promise.resolve();
    } catch (error: unknown) {
        return Promise.reject(new Error('Filter must be valid JSON logic'));
    }
}

function getChangedFieldNames(changedValues: Partial<RequirementFormValues>): string[] {
    return Object.keys(changedValues).map((fieldName: string): string => (
        fieldName === 'attributeRules' || fieldName === 'matchUnspecifiedAttributes' ?
            'attributeComparison' :
            fieldName
    ));
}

function removeInheritedFields(fields: Set<string>): Set<string> {
    const next = new Set(fields);
    for (const fieldName of INHERITED_FORM_FIELDS) {
        next.delete(fieldName);
    }

    return next;
}

function getAncestorFilters(
    parent: QualityRequirement | null,
    requirements: QualityRequirement[],
): string[] {
    const requirementsById = buildRequirementsById(requirements);
    const filters: string[] = [];
    const visited = new Set<number>();
    let current = parent;

    while (current && typeof current.id === 'number' && !visited.has(current.id)) {
        visited.add(current.id);

        if (current.filter) {
            filters.unshift(current.filter);
        }

        current = typeof current.parentRequirementId === 'number' ?
            requirementsById.get(current.parentRequirementId) ?? null :
            null;
    }

    return filters;
}

export default function QualityRequirementForm(props: Readonly<Props>): JSX.Element {
    const {
        settings,
        labels,
        requirement,
        parentRequirement,
        disabled,
        onCancel,
        onReload,
    } = props;

    const [form] = Form.useForm<RequirementFormValues>();
    const [submitting, setSubmitting] = useState(false);
    const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());
    const [resetFields, setResetFields] = useState<Set<string>>(new Set());
    const initialValues = useMemo(
        () => getInitialValues(requirement, parentRequirement, settings.requirements),
        [requirement, parentRequirement, settings.requirements],
    );
    const parentOptions = useMemo(
        () => buildParentOptions(settings.requirements, requirement),
        [settings.requirements, requirement],
    );
    const watchedAnnotationType = Form.useWatch('annotationType', form);
    const watchedParentRequirement = Form.useWatch('parentRequirement', form);
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
    const formDisabled = disabled || submitting;
    const isDefaultRequirement = !!requirement?.isDefault;
    const parentRequirementRequired = !isDefaultRequirement;
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
                await requirement.save(fields as any);
            } else {
                await core.analytics.quality.requirements.create(fields);
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
        if (annotationType === 'tag') {
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
                                                {value === 'group_bbox_size' ? 'Group bbox size' : 'Image size'}
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
                    {renderPercentInput('requiredScore', 'Target metric threshold')}
                </Col>
                <Col span={12}>
                    <Form.Item name='enabled' valuePropName='checked'>
                        <Checkbox>Enabled</Checkbox>
                    </Form.Item>
                </Col>
            </Row>
            {renderShapeComparison()}
        </Form>
    );
}
