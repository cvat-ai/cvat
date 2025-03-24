// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import _ from 'lodash';
import { FieldUpdateTrigger } from './common';
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

const settingsMapping: Record<string, string> = {
    iouThreshold: 'iou_threshold',
    oksSigma: 'oks_sigma',
    pointSizeBase: 'point_size_base',
    lineThickness: 'line_thickness',
    lowOverlapThreshold: 'low_overlap_threshold',
    orientedLines: 'compare_line_orientation',
    lineOrientationThreshold: 'line_orientation_threshold',
    compareGroups: 'compare_groups',
    groupMatchThreshold: 'group_match_threshold',
    checkCoveredAnnotations: 'check_covered_annotations',
    objectVisibilityThreshold: 'object_visibility_threshold',
    panopticComparison: 'panoptic_comparison',
    compareAttributes: 'compare_attributes',
    targetMetric: 'target_metric',
    targetMetricThreshold: 'target_metric_threshold',
    maxValidationsPerJob: 'max_validations_per_job',
    emptyIsAnnotated: 'empty_is_annotated',
    jobFilter: 'job_filter',
    inherit: 'inherit',
};

export default class QualitySettings {
    #id: number;
    #targetMetric: TargetMetric;
    #targetMetricThreshold: number;
    #maxValidationsPerJob: number;
    #taskID: number;
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
    #jobFilter: string;
    #inherit: boolean;
    #descriptions: Record<string, string>;

    #updateTrigger: FieldUpdateTrigger;

    constructor(initialData: SerializedQualitySettingsData) {
        this.#id = initialData.id;
        this.#taskID = initialData.task_id;
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
        this.#jobFilter = initialData.job_filter || '';
        this.#inherit = initialData.inherit;
        this.#descriptions = initialData.descriptions;

        this.#updateTrigger = new FieldUpdateTrigger();
    }

    get id(): number {
        return this.#id;
    }

    get taskID(): number {
        return this.#taskID;
    }

    get iouThreshold(): number {
        return this.#iouThreshold;
    }
    set iouThreshold(newVal: number) {
        this.#iouThreshold = newVal;
        this.#updateTrigger.update('iou_threshold');
    }

    get oksSigma(): number {
        return this.#oksSigma;
    }
    set oksSigma(newVal: number) {
        this.#oksSigma = newVal;
        this.#updateTrigger.update('oksSigma');
    }

    get pointSizeBase(): PointSizeBase {
        return this.#pointSizeBase;
    }
    set pointSizeBase(newVal: PointSizeBase) {
        this.#pointSizeBase = newVal;
        this.#updateTrigger.update('pointSizeBase');
    }

    get lineThickness(): number {
        return this.#lineThickness;
    }
    set lineThickness(newVal: number) {
        this.#lineThickness = newVal;
        this.#updateTrigger.update('lineThickness');
    }

    get lowOverlapThreshold(): number {
        return this.#lowOverlapThreshold;
    }
    set lowOverlapThreshold(newVal: number) {
        this.#lowOverlapThreshold = newVal;
        this.#updateTrigger.update('lowOverlapThreshold');
    }

    get orientedLines(): boolean {
        return this.#orientedLines;
    }
    set orientedLines(newVal: boolean) {
        this.#orientedLines = newVal;
        this.#updateTrigger.update('orientedLines');
    }

    get lineOrientationThreshold(): number {
        return this.#lineOrientationThreshold;
    }
    set lineOrientationThreshold(newVal: number) {
        this.#lineOrientationThreshold = newVal;
        this.#updateTrigger.update('lineOrientationThreshold');
    }

    get compareGroups(): boolean {
        return this.#compareGroups;
    }
    set compareGroups(newVal: boolean) {
        this.#compareGroups = newVal;
        this.#updateTrigger.update('compareGroups');
    }

    get groupMatchThreshold(): number {
        return this.#groupMatchThreshold;
    }
    set groupMatchThreshold(newVal: number) {
        this.#groupMatchThreshold = newVal;
        this.#updateTrigger.update('groupMatchThreshold');
    }

    get checkCoveredAnnotations(): boolean {
        return this.#checkCoveredAnnotations;
    }
    set checkCoveredAnnotations(newVal: boolean) {
        this.#checkCoveredAnnotations = newVal;
        this.#updateTrigger.update('checkCoveredAnnotations');
    }

    get objectVisibilityThreshold(): number {
        return this.#objectVisibilityThreshold;
    }
    set objectVisibilityThreshold(newVal: number) {
        this.#objectVisibilityThreshold = newVal;
        this.#updateTrigger.update('objectVisibilityThreshold');
    }

    get panopticComparison(): boolean {
        return this.#panopticComparison;
    }
    set panopticComparison(newVal: boolean) {
        this.#panopticComparison = newVal;
        this.#updateTrigger.update('panopticComparison');
    }

    get compareAttributes(): boolean {
        return this.#compareAttributes;
    }
    set compareAttributes(newVal: boolean) {
        this.#compareAttributes = newVal;
        this.#updateTrigger.update('compareAttributes');
    }

    get targetMetric(): TargetMetric {
        return this.#targetMetric;
    }
    set targetMetric(newVal: TargetMetric) {
        this.#targetMetric = newVal;
        this.#updateTrigger.update('targetMetric');
    }

    get targetMetricThreshold(): number {
        return this.#targetMetricThreshold;
    }
    set targetMetricThreshold(newVal: number) {
        this.#targetMetricThreshold = newVal;
        this.#updateTrigger.update('targetMetricThreshold');
    }

    get maxValidationsPerJob(): number {
        return this.#maxValidationsPerJob;
    }
    set maxValidationsPerJob(newVal: number) {
        this.#maxValidationsPerJob = newVal;
        this.#updateTrigger.update('maxValidationsPerJob');
    }

    get emptyIsAnnotated(): boolean {
        return this.#emptyIsAnnotated;
    }
    set emptyIsAnnotated(newVal: boolean) {
        this.#emptyIsAnnotated = newVal;
        this.#updateTrigger.update('emptyIsAnnotated');
    }

    get jobFilter(): string {
        return this.#jobFilter;
    }
    set jobFilter(newVal: string) {
        this.#jobFilter = newVal;
        this.#updateTrigger.update('jobFilter');
    }

    get inherit(): boolean {
        return this.#inherit;
    }
    set inherit(newVal: boolean) {
        this.#inherit = newVal;
        this.#updateTrigger.update('inherit');
    }

    get descriptions(): Record<string, string> {
        const descriptions: Record<string, string> = Object.keys(this.#descriptions).reduce((acc, key) => {
            const camelCaseKey = _.camelCase(key);
            acc[camelCaseKey] = this.#descriptions[key];
            return acc;
        }, {});

        return descriptions;
    }

    resetUpdated(): void {
        this.#updateTrigger.reset();
    }

    getUpdated(): Record<string, unknown> {
        return this.#updateTrigger.getUpdated(this, settingsMapping);
    }

    public toJSON(): SerializedQualitySettingsData {
        const result: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(settingsMapping)) {
            result[value] = this[key];
        }

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
                this.id, this.getUpdated(),
            );

            this.resetUpdated();
            const schema = await getServerAPISchema();
            const descriptions = convertDescriptions(schema.components.schemas.QualitySettings.properties);
            return new QualitySettings({ ...result, descriptions });
        },
    },
});
