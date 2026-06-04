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
        match_attributes: requirement.matchAttributes,
        attribute_comparison: requirement.attributeComparison,
        empty_is_annotated: requirement.emptyIsAnnotated,
        created_date: requirement.createdDate,
        updated_date: requirement.updatedDate,
    };
}

export function requirementToSaveFields(requirement: QualityRequirement): SerializedQualityRequirementData {
    const {
        id,
        is_default,
        task_id,
        project_id,
        effective,
        created_date,
        updated_date,
        ...fields
    } = requirementToRaw(requirement);

    return fields;
}

export function rawToSaveFields(rawRequirement: RequirementRawData): SerializedQualityRequirementData {
    const {
        id,
        is_default,
        task_id,
        project_id,
        effective,
        created_date,
        updated_date,
        ...fields
    } = rawRequirement;

    return fields;
}
