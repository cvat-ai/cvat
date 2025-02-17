// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import _ from 'lodash';
import { SerializedQualitySettingsData } from './server-response-types';
import PluginRegistry from './plugins';
import serverProxy from './server-proxy';
import { convertDescriptions, getServerAPISchema } from './server-schema';

export enum TargetMetric {
    ACCURACY = 'accuracy',
    PRECISION = 'precision',
    RECALL = 'recall',
}

export enum PointSizeBase {
    IMAGE_SIZE = 'image_size',
    GROUP_BBOX_SIZE = 'group_bbox_size',
}

export default class QualitySettings {
    #id: number;
    #targetMetric: TargetMetric;
    #targetMetricThreshold: number;
    #maxValidationsPerJob: number;
    #task: number;
    #iouThreshold: number;
    #oksSigma: number;
    #pointSizeBase: PointSizeBase;
    #lineThickness: number;
    #lowOverlapThreshold: number;
    #orientedLines: boolean;
    #lineOrientationThreshold: number;
    #compareGroups: boolean;
    #groupMatchThreshold: number;
    #checkCoveredAnnotations: boolean;
    #objectVisibilityThreshold: number;
    #panopticComparison: boolean;
    #compareAttributes: boolean;
    #emptyIsAnnotated: boolean;
    #descriptions: Record<string, string>;

    constructor(initialData: SerializedQualitySettingsData) {
        this.#id = initialData.id;
        this.#task = initialData.task;
        this.#targetMetric = initialData.target_metric as TargetMetric;
        this.#targetMetricThreshold = initialData.target_metric_threshold;
        this.#maxValidationsPerJob = initialData.max_validations_per_job;
        this.#iouThreshold = initialData.iou_threshold;
        this.#oksSigma = initialData.oks_sigma;
        this.#pointSizeBase = initialData.point_size_base as PointSizeBase;
        this.#lineThickness = initialData.line_thickness;
        this.#lowOverlapThreshold = initialData.low_overlap_threshold;
        this.#orientedLines = initialData.compare_line_orientation;
        this.#lineOrientationThreshold = initialData.line_orientation_threshold;
        this.#compareGroups = initialData.compare_groups;
        this.#groupMatchThreshold = initialData.group_match_threshold;
        this.#checkCoveredAnnotations = initialData.check_covered_annotations;
        this.#objectVisibilityThreshold = initialData.object_visibility_threshold;
        this.#panopticComparison = initialData.panoptic_comparison;
        this.#compareAttributes = initialData.compare_attributes;
        this.#emptyIsAnnotated = initialData.empty_is_annotated;
        this.#descriptions = initialData.descriptions;
    }

    get id(): number {
        return this.#id;
    }

    get task(): number {
        return this.#task;
    }

    get iouThreshold(): number {
        return this.#iouThreshold;
    }

    set iouThreshold(newVal: number) {
        this.#iouThreshold = newVal;
    }

    get oksSigma(): number {
        return this.#oksSigma;
    }

    set oksSigma(newVal: number) {
        this.#oksSigma = newVal;
    }

    get pointSizeBase(): PointSizeBase {
        return this.#pointSizeBase;
    }

    set pointSizeBase(newVal: PointSizeBase) {
        this.#pointSizeBase = newVal;
    }

    get lineThickness(): number {
        return this.#lineThickness;
    }

    set lineThickness(newVal: number) {
        this.#lineThickness = newVal;
    }

    get lowOverlapThreshold(): number {
        return this.#lowOverlapThreshold;
    }

    set lowOverlapThreshold(newVal: number) {
        this.#lowOverlapThreshold = newVal;
    }

    get orientedLines(): boolean {
        return this.#orientedLines;
    }

    set orientedLines(newVal: boolean) {
        this.#orientedLines = newVal;
    }

    get lineOrientationThreshold(): number {
        return this.#lineOrientationThreshold;
    }

    set lineOrientationThreshold(newVal: number) {
        this.#lineOrientationThreshold = newVal;
    }

    get compareGroups(): boolean {
        return this.#compareGroups;
    }

    set compareGroups(newVal: boolean) {
        this.#compareGroups = newVal;
    }

    get groupMatchThreshold(): number {
        return this.#groupMatchThreshold;
    }

    set groupMatchThreshold(newVal: number) {
        this.#groupMatchThreshold = newVal;
    }

    get checkCoveredAnnotations(): boolean {
        return this.#checkCoveredAnnotations;
    }

    set checkCoveredAnnotations(newVal: boolean) {
        this.#checkCoveredAnnotations = newVal;
    }

    get objectVisibilityThreshold(): number {
        return this.#objectVisibilityThreshold;
    }

    set objectVisibilityThreshold(newVal: number) {
        this.#objectVisibilityThreshold = newVal;
    }

    get panopticComparison(): boolean {
        return this.#panopticComparison;
    }

    set panopticComparison(newVal: boolean) {
        this.#panopticComparison = newVal;
    }

    get compareAttributes(): boolean {
        return this.#compareAttributes;
    }

    set compareAttributes(newVal: boolean) {
        this.#compareAttributes = newVal;
    }

    get targetMetric(): TargetMetric {
        return this.#targetMetric;
    }

    set targetMetric(newVal: TargetMetric) {
        this.#targetMetric = newVal;
    }

    get targetMetricThreshold(): number {
        return this.#targetMetricThreshold;
    }

    set targetMetricThreshold(newVal: number) {
        this.#targetMetricThreshold = newVal;
    }

    get maxValidationsPerJob(): number {
        return this.#maxValidationsPerJob;
    }

    set maxValidationsPerJob(newVal: number) {
        this.#maxValidationsPerJob = newVal;
    }

    get emptyIsAnnotated(): boolean {
        return this.#emptyIsAnnotated;
    }

    set emptyIsAnnotated(newVal: boolean) {
        this.#emptyIsAnnotated = newVal;
    }

    get descriptions(): Record<string, string> {
        const descriptions: Record<string, string> = Object.keys(this.#descriptions).reduce((acc, key) => {
            const camelCaseKey = _.camelCase(key);
            acc[camelCaseKey] = this.#descriptions[key];
            return acc;
        }, {});

        return descriptions;
    }

    public toJSON(): SerializedQualitySettingsData {
        const result: SerializedQualitySettingsData = {
            iou_threshold: this.#iouThreshold,
            oks_sigma: this.#oksSigma,
            point_size_base: this.#pointSizeBase,
            line_thickness: this.#lineThickness,
            low_overlap_threshold: this.#lowOverlapThreshold,
            compare_line_orientation: this.#orientedLines,
            line_orientation_threshold: this.#lineOrientationThreshold,
            compare_groups: this.#compareGroups,
            group_match_threshold: this.#groupMatchThreshold,
            check_covered_annotations: this.#checkCoveredAnnotations,
            object_visibility_threshold: this.#objectVisibilityThreshold,
            panoptic_comparison: this.#panopticComparison,
            compare_attributes: this.#compareAttributes,
            target_metric: this.#targetMetric,
            target_metric_threshold: this.#targetMetricThreshold,
            max_validations_per_job: this.#maxValidationsPerJob,
            empty_is_annotated: this.#emptyIsAnnotated,
        };

        return result;
    }

    public async save(): Promise<QualitySettings> {
        const result = await PluginRegistry.apiWrapper.call(this, QualitySettings.prototype.save);
        return result;
    }
}

Object.defineProperties(QualitySettings.prototype.save, {
    implementation: {
        writable: false,
        enumerable: false,
        value: async function implementation(): Promise<QualitySettings> {
            const result = await serverProxy.analytics.quality.settings.update(
                this.id, this.toJSON(),
            );
            const schema = await getServerAPISchema();
            const descriptions = convertDescriptions(schema.components.schemas.QualitySettings.properties);
            return new QualitySettings({ ...result, descriptions });
        },
    },
});
