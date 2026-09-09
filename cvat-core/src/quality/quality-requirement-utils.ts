// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import {
    QualityMetric,
    QualityMetricAggregation,
    QualityRequirementMetric,
} from './server-response-types';

export interface QualityTargetMetric {
    metric: QualityMetric;
    aggregation: QualityMetricAggregation;
}

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
