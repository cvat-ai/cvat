// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import {
    QualityRequirement,
} from 'cvat-core-wrapper';
import { SerializedQualityRequirementData } from 'cvat-core/src/server-response-types';

export const ANNOTATION_TYPE_LABELS: Record<string, string> = {
    tag: 'Tag',
    rectangle: 'Rectangle',
    skeleton: 'Skeleton',
    skeleton_keypoint: 'Skeleton keypoint',
    points: 'Points',
    polyline: 'Polyline',
    mask: 'Mask',
    polygon: 'Polygon',
    ellipse: 'Ellipse',
};

export const METRIC_LABELS: Record<string, string> = {
    accuracy: 'Accuracy',
    precision: 'Precision',
    recall: 'Recall',
    f1_score: 'F1 Score',
};

export const ANNOTATION_TYPES = Object.keys(ANNOTATION_TYPE_LABELS);
export const METRICS = Object.keys(METRIC_LABELS);

export type RequirementRawData = SerializedQualityRequirementData;

const QUALITY_REQUIREMENT_SAVE_FIELD_NAMES: (keyof SerializedQualityRequirementData)[] = [
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
        if (typeof requirement.id === 'number') {
            requirementsById.set(requirement.id, requirement);
        }
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

export function rawToSaveFields(rawRequirement: RequirementRawData): SerializedQualityRequirementData {
    const fields: SerializedQualityRequirementData = {};
    for (const fieldName of QUALITY_REQUIREMENT_SAVE_FIELD_NAMES) {
        fields[fieldName] = rawRequirement[fieldName] as never;
    }
    return fields as SerializedQualityRequirementData;
}

export function requirementToSaveFields(requirement: QualityRequirement): SerializedQualityRequirementData {
    return rawToSaveFields(requirementToRaw(requirement));
}
