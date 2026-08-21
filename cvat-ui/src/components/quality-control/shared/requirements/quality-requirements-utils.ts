// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { QualityRequirement } from 'cvat-core-wrapper';
import {
    QUALITY_REQUIREMENT_METRICS, QualityMetric, QualityMetricAggregation,
    QualityRequirementAnnotationType, QualityRequirementMetric, SerializedQualityRequirementSaveData,
    parseQualityTargetMetric,
} from 'cvat-core/src/quality/server-response-types';

export {
    parseQualityTargetMetric,
    QualityMetric,
    QualityMetricAggregation,
    QualityRequirementMetric,
};

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

const BASE_METRIC_LABELS: Record<QualityMetric, string> = {
    [QualityMetric.ACCURACY]: 'Accuracy',
    [QualityMetric.PRECISION]: 'Precision',
    [QualityMetric.RECALL]: 'Recall',
    [QualityMetric.JACCARD_INDEX]: 'Jaccard Index',
    [QualityMetric.DICE]: 'Dice Coefficient',
};

export const METRIC_LABELS: Record<string, string> = {
    ...Object.fromEntries(QUALITY_REQUIREMENT_METRICS.map((value) => {
        const { metric, aggregation } = parseQualityTargetMetric(value);
        const label = BASE_METRIC_LABELS[metric];

        if (aggregation === QualityMetricAggregation.MEAN) {
            return [value, `Mean ${label} (macro)`];
        }
        if (aggregation === QualityMetricAggregation.LABEL) {
            return [value, `${label} (worst label)`];
        }

        return [value, label];
    })),
    f1_score: 'F1 Score',
};

export const ANNOTATION_TYPES: QualityRequirementAnnotationType[] = Object.values(QualityRequirementAnnotationType);
export const METRICS: QualityRequirementMetric[] = QUALITY_REQUIREMENT_METRICS;
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

const ROOT_REQUIREMENT_INHERITED_FIELDS = new Set([
    'annotation_type',
    'metric',
    'required_score',
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
]);

export function requirementToSaveFields(requirement: QualityRequirement): SerializedQualityRequirementSaveData {
    const fields: SerializedQualityRequirementSaveData = {
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
    };

    if (requirement.isBase) {
        const mutableFields = fields as Record<string, unknown>;
        for (const fieldName of ROOT_REQUIREMENT_INHERITED_FIELDS) {
            if (mutableFields[fieldName] === null) {
                delete mutableFields[fieldName];
            }
        }
    }

    return fields;
}
