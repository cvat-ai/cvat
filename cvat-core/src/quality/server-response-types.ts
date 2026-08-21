// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { ObjectType } from '../enums';
import type { SerializedUser } from '../server-response-types';

export enum QualityRequirementAnnotationType {
    TAG = 'tag',
    RECTANGLE = 'rectangle',
    SKELETON = 'skeleton',
    SKELETON_KEYPOINT = 'skeleton_keypoint',
    POINTS = 'points',
    POLYLINE = 'polyline',
    MASK = 'mask',
    POLYGON = 'polygon',
    ELLIPSE = 'ellipse',
}

export enum QualityMetric {
    ACCURACY = 'accuracy',
    PRECISION = 'precision',
    RECALL = 'recall',
    JACCARD_INDEX = 'jaccard_index',
    DICE = 'dice',
}

export enum QualityMetricAggregation {
    MICRO = 'micro',
    MEAN = 'mean',
    LABEL = 'label',
}

export interface QualityTargetMetric {
    metric: QualityMetric;
    aggregation: QualityMetricAggregation;
}

type PrefixedQualityMetricAggregation = Exclude<
    QualityMetricAggregation,
    QualityMetricAggregation.MICRO
>;

export type QualityRequirementMetric = QualityMetric | `${PrefixedQualityMetricAggregation}_${QualityMetric}`;

// Preserve the existing value-level API for base metrics, e.g. QualityRequirementMetric.ACCURACY.
export const QualityRequirementMetric = QualityMetric;

export function serializeQualityTargetMetric(targetMetric: QualityTargetMetric): QualityRequirementMetric {
    const prefix = targetMetric.aggregation === QualityMetricAggregation.MICRO ? '' : `${targetMetric.aggregation}_`;
    return `${prefix}${targetMetric.metric}` as QualityRequirementMetric;
}

export function parseQualityTargetMetric(value: QualityRequirementMetric): QualityTargetMetric {
    const aggregation = Object.values(QualityMetricAggregation).find((candidate) => (
        candidate !== QualityMetricAggregation.MICRO && value.startsWith(`${candidate}_`)
    )) ?? QualityMetricAggregation.MICRO;
    const metric = (
        aggregation === QualityMetricAggregation.MICRO ?
            value : value.slice(aggregation.length + 1)
    ) as QualityMetric;

    return { metric, aggregation };
}

export const QUALITY_REQUIREMENT_METRICS: QualityRequirementMetric[] = [
    ...Object.values(QualityMetricAggregation).flatMap((aggregation) => (
        Object.values(QualityMetric).map((metric) => (
            serializeQualityTargetMetric({ metric, aggregation })
        ))
    )),
];

export enum QualityReportRequirementCalculationStatus {
    COMPUTED = 'computed',
    NOT_COMPUTED = 'not_computed',
}

export enum QualityReportRequirementCalculationReason {
    NO_ANNOTATIONS = 'no_annotations',
    FILTER_NO_MATCHES = 'filter_no_matches',
    REQUIRED_ATTRIBUTES_MISSING = 'required_attributes_missing',
}

export enum QualityRequirementPointSizeBase {
    IMAGE_SIZE = 'image_size',
    GROUP_BBOX_SIZE = 'group_bbox_size',
}

export enum QualityRequirementAttributeComparator {
    EXACT = 'exact',
    LEVENSHTEIN = 'levenshtein',
}

export type QualityRequirementJsonLogicFilter = string;

export interface SerializedQualityRequirementAttributeRule {
    spec_id: number;
    enabled: boolean;
    comparator?: QualityRequirementAttributeComparator | null;
    threshold?: number | null;
}

export interface SerializedQualityRequirementAttributeComparison {
    default?: {
        enabled?: boolean | null;
        comparator?: QualityRequirementAttributeComparator | null;
        threshold?: number | null;
    };
    rules?: SerializedQualityRequirementAttributeRule[];
}

export interface SerializedEffectiveQualityRequirementData {
    requirement_id: number | null;
    parent_requirement: number | null;
    name: string;
    sort_order: number;
    filter: QualityRequirementJsonLogicFilter;
    enabled: boolean;
    annotation_type: QualityRequirementAnnotationType;
    metric: QualityRequirementMetric;
    required_score: number;
    iou_threshold: number | null;
    point_size: number | null;
    point_size_base: QualityRequirementPointSizeBase | null;
    line_thickness: number | null;
    match_orientation: boolean | null;
    line_orientation_threshold: number | null;
    match_groups: boolean | null;
    group_match_threshold: number | null;
    check_covered_annotations: boolean | null;
    object_visibility_threshold: number | null;
    panoptic_comparison: boolean | null;
    attribute_comparison: SerializedQualityRequirementAttributeComparison;
}

export interface SerializedQualityRequirementFilters {
    inherited?: QualityRequirementJsonLogicFilter | null;
    current?: QualityRequirementJsonLogicFilter | null;
    effective?: QualityRequirementJsonLogicFilter | null;
}

export interface SerializedQualityRequirementData {
    id: number;
    settings_id: number;
    task_id: number | null;
    project_id: number | null;
    name: string;
    is_base: boolean;
    sort_order: number;
    filter: QualityRequirementJsonLogicFilter;
    enabled: boolean;
    annotation_type: QualityRequirementAnnotationType | null;
    metric: QualityRequirementMetric | null;
    required_score: number | null;
    parent_requirement: number | null;
    effective?: SerializedEffectiveQualityRequirementData;
    iou_threshold: number | null;
    point_size: number | null;
    point_size_base: QualityRequirementPointSizeBase | null;
    line_thickness: number | null;
    match_orientation: boolean | null;
    line_orientation_threshold: number | null;
    match_groups: boolean | null;
    group_match_threshold: number | null;
    check_covered_annotations: boolean | null;
    object_visibility_threshold: number | null;
    panoptic_comparison: boolean | null;
    attribute_comparison: SerializedQualityRequirementAttributeComparison | null;
    created_date: string;
    updated_date: string;
}

export type SerializedQualityRequirementSaveData = Partial<
    Omit<
        SerializedQualityRequirementData,
        'created_date' | 'updated_date' | 'effective' | 'is_base' | 'task_id' | 'project_id'
    >
>;

export interface SerializedInheritedQualityRequirementData {
    requirement: SerializedQualityRequirementData;
    parent_requirement?: SerializedQualityRequirementData | null;
    filters?: SerializedQualityRequirementFilters;
    effective?: SerializedEffectiveQualityRequirementData;
}

export interface SerializedQualityRequirementReportSummaryItem {
    requirement_id: number | null;
    name: string;
    metric: QualityRequirementMetric;
    score: number | null;
    score_components: {
        valid_count: number;
        missing_count: number;
        extra_count: number;
    };
    calculation: {
        status: QualityReportRequirementCalculationStatus;
        reason?: QualityReportRequirementCalculationReason;
    };
    threshold: number;
}

export interface SerializedQualityRequirementsReportSummary {
    total: number;
    enabled: number;
    completed: number;
    not_computed: number;
    items: SerializedQualityRequirementReportSummaryItem[];
}

export type SerializedQualityRequirementScore = SerializedQualityRequirementReportSummaryItem;

export interface SerializedQualityRequirementScores {
    total: number;
    completed: number;
    items: SerializedQualityRequirementScore[];
}

export interface SerializedQualityConfusionMatrixData {
    labels: string[];
    rows: number[][];
    axes: { cols: string; rows: string };
    precision: (number | null)[];
    recall: (number | null)[];
    accuracy: (number | null)[];
    jaccard_index: (number | null)[];
    dice: (number | null)[];
    target_metric_summary: {
        metric: 'accuracy' | 'precision' | 'recall' | 'jaccard_index' | 'dice';
        aggregation: 'micro' | 'mean' | 'label';
        values: {
            micro: number | null;
            mean: number | null;
            label: number | null;
        };
        worst_labels: string[];
    };
}

export interface SerializedQualitySettingsData {
    id: number;
    task_id: number | null;
    project_id: number | null;
    job_filter: string;
    inherit: boolean;
    max_validations_per_job: number;
    requirements: SerializedQualityRequirementData[];
    created_date: string;
    updated_date: string;
    descriptions?: Record<string, string>;
    requirement_descriptions?: Record<string, string>;
}

export type SerializedQualitySettingsSaveData = Partial<
    Omit<
        SerializedQualitySettingsData,
        'id' | 'task_id' | 'project_id' | 'created_date' | 'updated_date' |
        'descriptions' | 'requirement_descriptions'
    >
>;

export interface SerializedAnnotationConflictData {
    job_id: number;
    obj_id: number;
    type: ObjectType;
    shape_type: string | null;
    conflict_type?: string;
    severity?: string;
}

export interface SerializedQualityConflictData {
    id: number;
    frame: number;
    type: string;
    annotation_ids: SerializedAnnotationConflictData[];
    report_id: number;
    severity: string;
    attribute_names: string[];
}

export interface SerializedQualityReportData {
    id: number;
    parent_id: number | null;
    project_id: number | null;
    task_id: number | null;
    job_id: number | null;
    target: string;
    created_date: string;
    target_last_updated: string | null;
    gt_last_updated: string | null;
    assignee?: SerializedUser | null;
    summary: {
        total_frames: number;
        frame_count?: number;
        validation_frames: number;
        frame_share?: number;
        validation_frame_share: number;
        conflict_count: number;
        error_count: number;
        conflicts_by_type: {
            extra_annotation: number;
            missing_annotation: number;
            mismatching_label: number;
            mismatching_direction: number;
            mismatching_attributes: number;
            mismatching_groups: number;
            covered_annotation: number;
        }
        tasks?: {
            total: number;
            custom: number;
            not_configured: number;
            excluded: number;
            included: number;
            completed: number;
        }
        jobs?: {
            total: number;
            not_checkable: number;
            excluded: number;
            included: number;
            completed: number;
        }
        requirements?: SerializedQualityRequirementsReportSummary;
    };
}
