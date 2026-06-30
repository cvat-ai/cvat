// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { QualityRequirement } from 'cvat-core-wrapper';
import {
    QualityRequirementAnnotationType, QualityRequirementMetric,
    SerializedQualityRequirementData, SerializedQualityRequirementSaveData,
} from 'cvat-core/src/quality/server-response-types';

export const ANNOTATION_TYPE_LABELS: Record<string, string> = {
    [QualityRequirementAnnotationType.TAG]: 'Tag',
    [QualityRequirementAnnotationType.RECTANGLE]: 'Rectangle',
    [QualityRequirementAnnotationType.SKELETON]: 'Skeleton',
    [QualityRequirementAnnotationType.SKELETON_KEYPOINT]: 'Skeleton keypoint',
    [QualityRequirementAnnotationType.POINTS]: 'Points',
    [QualityRequirementAnnotationType.POLYLINE]: 'Polyline',
    [QualityRequirementAnnotationType.MASK]: 'Mask',
    [QualityRequirementAnnotationType.POLYGON]: 'Polygon',
    [QualityRequirementAnnotationType.ELLIPSE]: 'Ellipse',
};

export const METRIC_LABELS: Record<string, string> = {
    [QualityRequirementMetric.ACCURACY]: 'Accuracy',
    [QualityRequirementMetric.PRECISION]: 'Precision',
    [QualityRequirementMetric.RECALL]: 'Recall',
    f1_score: 'F1 Score',
};

export const ANNOTATION_TYPES: QualityRequirementAnnotationType[] = Object.values(QualityRequirementAnnotationType);
export const METRICS: QualityRequirementMetric[] = Object.values(QualityRequirementMetric);
export const QUALITY_REQUIREMENTS_RAW_FIELD = 'requirementsRaw';
export const QUALITY_REQUIREMENTS_ENABLED_FIELD = 'requirementsEnabled';

export type RequirementRawData = SerializedQualityRequirementData;

const QUALITY_REQUIREMENT_SAVE_FIELD_NAMES: (keyof SerializedQualityRequirementSaveData)[] = [
    'settings_id',
    'name',
    'sort_order',
    'filter',
    'enabled',
    'annotation_type',
    'metric',
    'required_score',
    'parent_requirement',
    'iou_threshold',
    'point_size',
    'point_size_base',
    'line_thickness',
    'match_orientation',
    'line_orientation_threshold',
    'match_groups',
    'group_match_threshold',
    'check_covered_annotations',
    'object_visibility_threshold',
    'panoptic_comparison',
    'attribute_comparison',
    'empty_is_annotated',
];

export function buildRequirementsById(requirements: QualityRequirement[]): Map<number, QualityRequirement> {
    const requirementsById = new Map<number, QualityRequirement>();

    for (const requirement of requirements) {
        requirementsById.set(requirement.id, requirement);
    }

    return requirementsById;
}

export function getRequirementEffectiveField<T>(
    requirement: QualityRequirement,
    fieldName: string,
): T | null | undefined {
    const effective = requirement.effective as Record<string, unknown> | null;
    return effective?.[fieldName] as T | null | undefined;
}

export function getRequirementResolvedValue<T>(
    requirement: QualityRequirement | null,
    requirementsById: Map<number, QualityRequirement>,
    getLocalValue: (item: QualityRequirement) => T | null | undefined,
    getEffectiveValue: (item: QualityRequirement) => T | null | undefined,
    defaultValue: T,
): T {
    let currentRequirement: QualityRequirement | null | undefined = requirement;
    const visitedRequirementIds = new Set<number>();

    while (currentRequirement) {
        const currentId = currentRequirement.id;
        if (typeof currentId === 'number') {
            if (visitedRequirementIds.has(currentId)) {
                return defaultValue;
            }
            visitedRequirementIds.add(currentId);
        }

        const effectiveValue = getEffectiveValue(currentRequirement);
        if (effectiveValue !== null && typeof effectiveValue !== 'undefined') {
            return effectiveValue;
        }

        const localValue = getLocalValue(currentRequirement);
        if (localValue !== null && typeof localValue !== 'undefined') {
            return localValue;
        }

        const parentId = currentRequirement.parentRequirementId;
        currentRequirement = typeof parentId === 'number' ? requirementsById.get(parentId) : null;
    }

    return defaultValue;
}

export function getRequirementDisplayValue<T>(
    requirement: QualityRequirement,
    requirementsById: Map<number, QualityRequirement>,
    getLocalValue: (item: QualityRequirement) => T | null | undefined,
    getEffectiveValue: (item: QualityRequirement) => T | null | undefined,
): T | null {
    return getRequirementResolvedValue<T | null>(
        requirement,
        requirementsById,
        getLocalValue,
        getEffectiveValue,
        null,
    );
}

function formatUnknownValue(value: string | null): string {
    if (!value) {
        return 'N/A';
    }

    return value.split('_').map((part: string): string => (
        part.charAt(0).toUpperCase() + part.slice(1)
    )).join(' ');
}

export function formatAnnotationType(value: string | null): string {
    return value ? ANNOTATION_TYPE_LABELS[value] ?? formatUnknownValue(value) : 'N/A';
}

export function formatMetric(value: string | null): string {
    return value ? METRIC_LABELS[value] ?? formatUnknownValue(value) : 'N/A';
}

export function formatThreshold(value: number | null): string {
    return typeof value === 'number' ? `${Math.round(value * 100)}%` : 'N/A';
}

export function requirementToRaw(requirement: QualityRequirement): RequirementRawData {
    return {
        id: requirement.id,
        settings_id: requirement.settingsId,
        task_id: requirement.taskId,
        project_id: requirement.projectId,
        name: requirement.name,
        is_default: requirement.isDefault,
        sort_order: requirement.sortOrder,
        filter: requirement.filter,
        enabled: requirement.enabled,
        annotation_type: requirement.annotationType,
        metric: requirement.metric,
        required_score: requirement.requiredScore,
        parent_requirement: requirement.parentRequirementId,
        iou_threshold: requirement.iouThreshold,
        point_size: requirement.pointSize,
        point_size_base: requirement.pointSizeBase,
        line_thickness: requirement.lineThickness,
        match_orientation: requirement.matchOrientation,
        line_orientation_threshold: requirement.lineOrientationThreshold,
        match_groups: requirement.matchGroups,
        group_match_threshold: requirement.groupMatchThreshold,
        check_covered_annotations: requirement.checkCoveredAnnotations,
        object_visibility_threshold: requirement.objectVisibilityThreshold,
        panoptic_comparison: requirement.panopticComparison,
        attribute_comparison: requirement.attributeComparison,
        empty_is_annotated: requirement.emptyIsAnnotated,
        created_date: requirement.createdDate,
        updated_date: requirement.updatedDate,
    };
}

export function rawToSaveFields(rawRequirement: RequirementRawData): SerializedQualityRequirementSaveData {
    const fields: SerializedQualityRequirementSaveData = {};
    for (const fieldName of QUALITY_REQUIREMENT_SAVE_FIELD_NAMES) {
        fields[fieldName] = rawRequirement[fieldName] as never;
    }
    return fields;
}

export function requirementToSaveFields(requirement: QualityRequirement): SerializedQualityRequirementSaveData {
    return rawToSaveFields(requirementToRaw(requirement));
}

function replaceTrailingCommas(value: string): string {
    return value.replace(/,{1}[\s]*}/g, '}').replace(/,{1}[\s]*]/g, ']');
}

export function parseRawRequirements(value: string): RequirementRawData[] {
    const parsed = JSON.parse(replaceTrailingCommas(value));
    if (!Array.isArray(parsed)) {
        throw new Error('Field is expected to be a JSON array');
    }

    return parsed;
}

export function validateRequirementNames(requirements: RequirementRawData[]): void {
    const names = requirements.map((requirement: RequirementRawData): string => (
        typeof requirement.name === 'string' ? requirement.name.trim() : ''
    ));

    if (names.some((name: string): boolean => !name)) {
        throw new Error('Requirement name is required');
    }

    if (new Set(names).size !== names.length) {
        throw new Error('Requirement name must be unique');
    }
}

export function validateKnownRequirementValues(requirements: RequirementRawData[]): void {
    for (const requirement of requirements) {
        if (requirement.annotation_type && !ANNOTATION_TYPES.includes(requirement.annotation_type)) {
            throw new Error(`Unknown annotation type "${requirement.annotation_type}"`);
        }

        if (requirement.metric && !METRICS.includes(requirement.metric)) {
            throw new Error(`Unknown metric "${requirement.metric}"`);
        }

        if (
            requirement.required_score !== null &&
            typeof requirement.required_score !== 'undefined' &&
            (typeof requirement.required_score !== 'number' ||
                requirement.required_score < 0 ||
                requirement.required_score > 1)
        ) {
            throw new Error('Required score must be a number from 0 to 1');
        }
    }
}

export function validateDefaultRequirementsArePresent(
    currentRequirements: QualityRequirement[],
    parsedRequirements: RequirementRawData[],
): void {
    const parsedIds = new Set(parsedRequirements
        .map((requirement: RequirementRawData): number | undefined => requirement.id)
        .filter((id: number | undefined): id is number => typeof id === 'number'));

    const removedDefault = currentRequirements.find((requirement: QualityRequirement): boolean => (
        requirement.isDefault && !parsedIds.has(requirement.id)
    ));

    if (removedDefault) {
        throw new Error(`Default requirement "${removedDefault.name}" cannot be removed`);
    }
}

export function validateRawRequirements(
    currentRequirements: QualityRequirement[],
    parsedRequirements: RequirementRawData[],
): void {
    validateRequirementNames(parsedRequirements);
    validateKnownRequirementValues(parsedRequirements);
    validateDefaultRequirementsArePresent(currentRequirements, parsedRequirements);
}
