// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import {
    Label, QualityRequirement, QualityRequirementSaveFields, QualitySettings,
} from 'cvat-core-wrapper';
import {
    QualityRequirementAnnotationType, QualityRequirementAttributeComparator,
    QualityRequirementMetric, QualityRequirementPointSizeBase,
    SerializedQualityRequirementAttributeComparison,
    SerializedQualityRequirementAttributeRule,
} from 'cvat-core/src/quality/server-response-types';
import {
    buildRequirementsById,
    getRequirementEffectiveField,
    getRequirementResolvedValue,
} from './quality-requirements-utils';

export const ROOT_DEFAULTS = {
    annotationType: QualityRequirementAnnotationType.RECTANGLE,
    metric: QualityRequirementMetric.ACCURACY,
    requiredScore: 70,
    iouThreshold: 40,
    pointSize: 9,
    pointSizeBase: QualityRequirementPointSizeBase.GROUP_BBOX_SIZE,
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

export const METRIC_OPTIONS: QualityRequirementMetric[] = Object.values(QualityRequirementMetric);
export const POINT_SIZE_BASE_OPTIONS: QualityRequirementPointSizeBase[] = Object.values(
    QualityRequirementPointSizeBase,
);
export const IOU_ANNOTATION_TYPES = new Set<QualityRequirementAnnotationType>([
    QualityRequirementAnnotationType.RECTANGLE,
    QualityRequirementAnnotationType.ELLIPSE,
    QualityRequirementAnnotationType.POLYGON,
    QualityRequirementAnnotationType.MASK,
    QualityRequirementAnnotationType.POLYLINE,
]);
export const POINT_ANNOTATION_TYPES = new Set<QualityRequirementAnnotationType>([
    QualityRequirementAnnotationType.POINTS,
    QualityRequirementAnnotationType.SKELETON,
    QualityRequirementAnnotationType.SKELETON_KEYPOINT,
]);
export const SEGMENTATION_ANNOTATION_TYPES = new Set<QualityRequirementAnnotationType>([
    QualityRequirementAnnotationType.POLYGON,
    QualityRequirementAnnotationType.MASK,
]);

export type InheritedFormFieldName =
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

export type OverridableFormFieldName = Exclude<InheritedFormFieldName, 'annotationType' | 'attributeComparison'>;

export const INHERITED_FORM_FIELDS = new Set<InheritedFormFieldName>([
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

export const OVERRIDABLE_FORM_FIELDS: OverridableFormFieldName[] = [
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

export interface AttributeRuleFormValue {
    specId?: number;
    enabled?: boolean;
    comparator?: QualityRequirementAttributeComparator;
    threshold?: number | null;
    isLocal?: boolean;
}

export interface RequirementFormValues {
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

export interface QualityRequirementFormProps {
    settings: QualitySettings;
    labels: Label[];
    requirement: QualityRequirement | null;
    parentRequirement: QualityRequirement | null;
    copiedRequirement: QualityRequirement | null;
    disabled: boolean;
    onCancel: () => void;
    onReload: () => Promise<void>;
}

interface SerializedInheritedFieldDescriptor {
    fieldName: InheritedFormFieldName;
    getValue: (values: RequirementFormValues, isRootRequirement: boolean) => unknown;
}

export interface AttributeOption {
    value: number;
    label: string;
}

export function toPercent(value: number | null | undefined): number | undefined {
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

export function formatDescription(description = ''): string {
    return description.replaceAll(/\s+/g, ' ').trim();
}

export function getPointSizeBaseDescription(description = ''): string {
    const endIndex = description.indexOf('\n\n\n');
    const trimmedDescription = endIndex === -1 ? description : description.substring(0, endIndex);
    return formatDescription(trimmedDescription);
}

function getAttributeRuleSpecId(rule: Record<string, unknown>): number | undefined {
    const value = rule.spec_id ?? rule.specId;
    return typeof value === 'number' ? value : undefined;
}

function normalizeAttributeRule(rule: SerializedQualityRequirementAttributeRule): AttributeRuleFormValue {
    return {
        specId: getAttributeRuleSpecId(rule as unknown as Record<string, unknown>),
        enabled: rule.enabled ?? true,
        comparator: rule.comparator ?? QualityRequirementAttributeComparator.EXACT,
        threshold: typeof rule.threshold === 'number' ? rule.threshold : null,
    };
}

function collectRequirementChain(
    requirement: QualityRequirement | null,
    requirementsById: Map<number, QualityRequirement>,
): QualityRequirement[] {
    const chain: QualityRequirement[] = [];
    const visited = new Set<number>();
    let current: QualityRequirement | null | undefined = requirement;
    while (current) {
        const currentId = current.id;
        if (typeof currentId === 'number') {
            if (visited.has(currentId)) {
                break;
            }
            visited.add(currentId);
        }
        chain.push(current);
        const parentId = current.parentRequirementId;
        current = typeof parentId === 'number' ? requirementsById.get(parentId) ?? null : null;
    }
    return chain;
}

function resolveInheritedAttributeComparison(
    requirement: QualityRequirement | null,
    requirementsById: Map<number, QualityRequirement>,
): { defaultEnabled: boolean; rules: Map<number, AttributeRuleFormValue> } {
    const chain = collectRequirementChain(requirement, requirementsById);
    const rules = new Map<number, AttributeRuleFormValue>();
    let defaultEnabled = false;

    for (let i = chain.length - 1; i >= 0; i -= 1) {
        const comparison = chain[i].attributeComparison;
        if (!comparison) {
            continue;
        }

        const enabled = comparison.default?.enabled;
        if (typeof enabled === 'boolean') {
            defaultEnabled = enabled;
        }

        for (const rule of comparison.rules ?? []) {
            const normalized = normalizeAttributeRule(rule);
            if (typeof normalized.specId === 'number') {
                rules.set(normalized.specId, normalized);
            }
        }
    }

    return { defaultEnabled, rules };
}

export function buildAttributeOptions(labels: Label[]): AttributeOption[] {
    const options: AttributeOption[] = [];
    const registerLabelAttributes = (label: Label, labelName: string): void => {
        label.attributes.forEach((attribute) => {
            if (typeof attribute.id !== 'number' || attribute.deleted) {
                return;
            }

            const optionLabel = `${labelName}.${attribute.name}`;
            options.push({
                value: attribute.id,
                label: optionLabel,
            });
        });
    };

    labels.forEach((label) => {
        registerLabelAttributes(label, label.name);
        label.structure?.sublabels.forEach((sublabel) => {
            registerLabelAttributes(sublabel, `${label.name}.${sublabel.name}`);
        });
    });

    return options.sort((first, second) => first.label.localeCompare(second.label));
}

export function getInitialValues(
    requirement: QualityRequirement | null,
    parentRequirement: QualityRequirement | null,
    requirements: QualityRequirement[],
): RequirementFormValues {
    const sourceRequirement = requirement ?? parentRequirement;
    const requirementsById = buildRequirementsById(requirements);
    let inheritanceRoot: QualityRequirement | null;
    if (requirement) {
        inheritanceRoot = typeof requirement.parentRequirementId === 'number' ?
            requirementsById.get(requirement.parentRequirementId) ?? null :
            null;
    } else {
        inheritanceRoot = parentRequirement;
    }
    const inheritedComparison = resolveInheritedAttributeComparison(inheritanceRoot, requirementsById);
    const ownAttributeComparison = requirement?.attributeComparison ?? null;
    const ownAttributeRulesBySpecId = new Map<number, AttributeRuleFormValue>();
    for (const rule of ownAttributeComparison?.rules ?? []) {
        const normalized = normalizeAttributeRule(rule);
        if (typeof normalized.specId === 'number') {
            ownAttributeRulesBySpecId.set(normalized.specId, normalized);
        }
    }

    const attributeRules: AttributeRuleFormValue[] = [];
    for (const [specId, inheritedRule] of inheritedComparison.rules) {
        const ownRule = ownAttributeRulesBySpecId.get(specId);
        attributeRules.push(ownRule ? { ...ownRule, isLocal: true } : { ...inheritedRule, isLocal: false });
    }
    for (const [specId, ownRule] of ownAttributeRulesBySpecId) {
        if (!inheritedComparison.rules.has(specId)) {
            attributeRules.push({ ...ownRule, isLocal: true });
        }
    }

    const ownDefaultEnabled = ownAttributeComparison?.default?.enabled;
    const matchUnspecifiedAttributes = typeof ownDefaultEnabled === 'boolean' ?
        ownDefaultEnabled :
        inheritedComparison.defaultEnabled;

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
        matchUnspecifiedAttributes,
        attributeRules,
    };
}

export function getCopiedInitialValues(
    copiedRequirement: QualityRequirement,
    parentRequirement: QualityRequirement | null,
    requirements: QualityRequirement[],
): RequirementFormValues {
    return {
        ...getInitialValues(copiedRequirement, null, requirements),
        name: `Copy of ${copiedRequirement.name}`,
        parentRequirement: parentRequirement?.id ?? copiedRequirement.parentRequirementId ?? null,
    };
}

function buildDescendantIdSet(requirements: QualityRequirement[], requirement: QualityRequirement | null): Set<number> {
    const excludedIds = new Set<number>();
    if (!requirement) {
        return excludedIds;
    }

    excludedIds.add(requirement.id);
    let changed = true;
    while (changed) {
        changed = false;
        for (const candidate of requirements) {
            if (
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

export function buildParentOptions(
    requirements: QualityRequirement[],
    requirement: QualityRequirement | null,
): { value: number; label: string }[] {
    const excludedIds = buildDescendantIdSet(requirements, requirement);
    const childrenByParent = new Map<number | null, QualityRequirement[]>();
    const requirementIds = new Set(requirements.map((item) => item.id));

    for (const item of requirements) {
        if (excludedIds.has(item.id)) {
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

export function hasLocalInheritedField(requirement: QualityRequirement, fieldName: InheritedFormFieldName): boolean {
    const value = LOCAL_INHERITED_FIELD_GETTERS[fieldName](requirement);
    return value !== null && typeof value !== 'undefined';
}

export function getCopiedTouchedFields(copiedRequirement: QualityRequirement | null): Set<string> {
    const fields = new Set<string>();
    if (!copiedRequirement || copiedRequirement.parentRequirementId === null) {
        return fields;
    }

    for (const fieldName of INHERITED_FORM_FIELDS) {
        if (hasLocalInheritedField(copiedRequirement, fieldName)) {
            fields.add(fieldName);
        }
    }

    return fields;
}

function setResettableFieldValue(
    fields: QualityRequirementSaveFields,
    resetFields: Set<string>,
    fieldName: InheritedFormFieldName,
    value: unknown,
): void {
    Object.assign(fields, {
        [fieldName]: resetFields.has(fieldName) ? null : value,
    });
}

function buildAttributeComparison(
    values: RequirementFormValues,
    isRootRequirement: boolean,
): SerializedQualityRequirementAttributeComparison | null {
    const rules = (values.attributeRules ?? [])
        .filter((rule): rule is Required<Pick<AttributeRuleFormValue, 'specId'>> & AttributeRuleFormValue => (
            typeof rule.specId === 'number' && (isRootRequirement || !!rule.isLocal)
        ))
        .map((rule) => {
            const comparator = rule.comparator ?? QualityRequirementAttributeComparator.EXACT;
            const shouldSaveThreshold = (
                comparator === QualityRequirementAttributeComparator.LEVENSHTEIN &&
                typeof rule.threshold === 'number'
            );

            return {
                spec_id: rule.specId,
                enabled: rule.enabled ?? true,
                comparator,
                ...(shouldSaveThreshold ? { threshold: rule.threshold } : {}),
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
            ...(values.matchUnspecifiedAttributes ? {
                comparator: QualityRequirementAttributeComparator.EXACT,
            } : {}),
        },
        ...(rules.length ? { rules } : {}),
    };
}

const SERIALIZED_INHERITED_FIELD_DESCRIPTORS: SerializedInheritedFieldDescriptor[] = [{
    fieldName: 'metric',
    getValue: (values: RequirementFormValues) => values.metric,
}, {
    fieldName: 'requiredScore',
    getValue: (values: RequirementFormValues) => fromPercent(values.requiredScore),
}, {
    fieldName: 'iouThreshold',
    getValue: (values: RequirementFormValues) => fromPercent(values.iouThreshold),
}, {
    fieldName: 'pointSize',
    getValue: (values: RequirementFormValues) => fromPercent(values.pointSize),
}, {
    fieldName: 'pointSizeBase',
    getValue: (values: RequirementFormValues) => values.pointSizeBase ?? null,
}, {
    fieldName: 'lineThickness',
    getValue: (values: RequirementFormValues) => fromPercent(values.lineThickness),
}, {
    fieldName: 'matchOrientation',
    getValue: (values: RequirementFormValues) => values.matchOrientation ?? null,
}, {
    fieldName: 'lineOrientationThreshold',
    getValue: (values: RequirementFormValues) => fromPercent(values.lineOrientationThreshold),
}, {
    fieldName: 'matchGroups',
    getValue: (values: RequirementFormValues) => values.matchGroups ?? null,
}, {
    fieldName: 'groupMatchThreshold',
    getValue: (values: RequirementFormValues) => fromPercent(values.groupMatchThreshold),
}, {
    fieldName: 'checkCoveredAnnotations',
    getValue: (values: RequirementFormValues) => values.checkCoveredAnnotations ?? null,
}, {
    fieldName: 'objectVisibilityThreshold',
    getValue: (values: RequirementFormValues) => fromPercent(values.objectVisibilityThreshold),
}, {
    fieldName: 'panopticComparison',
    getValue: (values: RequirementFormValues) => values.panopticComparison ?? null,
}, {
    fieldName: 'emptyIsAnnotated',
    getValue: (values: RequirementFormValues) => values.emptyIsAnnotated ?? null,
}, {
    fieldName: 'attributeComparison',
    getValue: (values: RequirementFormValues, isRootRequirement: boolean) => (
        buildAttributeComparison(values, isRootRequirement)
    ),
}];

export function serializeRequirementValues(
    values: RequirementFormValues,
    settings: QualitySettings,
    requirement: QualityRequirement | null,
    touchedFields: Set<string>,
    resetFields: Set<string>,
): QualityRequirementSaveFields {
    const parentRequirement = values.parentRequirement ?? null;
    const isRootRequirement = parentRequirement === null;
    const fields: QualityRequirementSaveFields = {
        name: values.name.trim(),
        parentRequirement,
        filter: values.filter ?? '',
        enabled: values.enabled,
    };

    if (!requirement) {
        fields.settingsId = settings.id;
        fields.sortOrder = Math.max(0, ...settings.requirements.map((item) => item.sortOrder)) + 1;
    }

    fields.annotationType = isRootRequirement ? values.annotationType : null;

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
            descriptor.getValue(values, isRootRequirement),
        );
    }

    return fields;
}

export function validateJsonLogic(_: unknown, value: string | undefined): Promise<void> {
    if (!value) {
        return Promise.resolve();
    }

    try {
        const parsedValue = JSON.parse(value);
        if (!parsedValue || Array.isArray(parsedValue) || typeof parsedValue !== 'object') {
            return Promise.reject(new Error('Filter must be a JSON logic object'));
        }

        return Promise.resolve();
    } catch (_error: unknown) {
        return Promise.reject(new Error('Filter must be valid JSON logic'));
    }
}

export function getChangedFieldNames(changedValues: Partial<RequirementFormValues>): string[] {
    return Object.keys(changedValues).map((fieldName: string): string => (
        fieldName === 'attributeRules' || fieldName === 'matchUnspecifiedAttributes' ?
            'attributeComparison' :
            fieldName
    ));
}

export function removeInheritedFields(fields: Set<string>): Set<string> {
    const next = new Set(fields);
    for (const fieldName of INHERITED_FORM_FIELDS) {
        next.delete(fieldName);
    }

    return next;
}

export function getAncestorFilters(
    parent: QualityRequirement | null,
    requirements: QualityRequirement[],
): string[] {
    const requirementsById = buildRequirementsById(requirements);
    const filters: string[] = [];
    const visited = new Set<number>();
    let current = parent;

    while (current && !visited.has(current.id)) {
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
