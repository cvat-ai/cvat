// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { QualityRequirement } from 'cvat-core-wrapper';
import {
    QualityRequirementAnnotationType, QualityRequirementMetric, SerializedQualityRequirementSaveData,
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
export const QUALITY_REQUIREMENTS_ENABLED_FIELD = 'requirementsEnabled';

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

export function requirementToSaveFields(requirement: QualityRequirement): SerializedQualityRequirementSaveData {
    return {
        settings_id: requirement.settingsId,
        name: requirement.name,
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
    };
}
