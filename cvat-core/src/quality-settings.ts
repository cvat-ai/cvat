// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import _ from 'lodash';
import { SerializedQualitySettingsData } from './server-response-types';
import PluginRegistry from './plugins';
import serverProxy from './server-proxy';
import { convertDescriptions, getServerAPISchema } from './server-schema';
import { fieldsToSnakeCase } from './common';
import { Camelized } from './type-utils';

export enum TargetMetric {
    ACCURACY = 'accuracy',
    PRECISION = 'precision',
    RECALL = 'recall',
}

export enum PointSizeBase {
    IMAGE_SIZE = 'image_size',
    GROUP_BBOX_SIZE = 'group_bbox_size',
}

export type QualitySettingsSaveFields = Partial<Camelized<
Omit<SerializedQualitySettingsData, 'id' | 'task_id' | 'descriptions'>
>>;

export default class QualitySettings {
    #id: number;
    #targetMetric: TargetMetric;
    #targetMetricThreshold: number;
    #maxValidationsPerJob: number;
    #taskId: number;
    #iouThreshold: number;
    #oksSigma: number;
    #pointSizeBase: PointSizeBase;
    #lineThickness: number;
    #lowOverlapThreshold: number;
    #compareLineOrientation: boolean;
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

    constructor(initialData: SerializedQualitySettingsData) {
        this.#id = initialData.id;
        this.#taskId = initialData.task_id;
        this.#targetMetric = initialData.target_metric as TargetMetric;
        this.#targetMetricThreshold = initialData.target_metric_threshold;
        this.#maxValidationsPerJob = initialData.max_validations_per_job;
        this.#iouThreshold = initialData.iou_threshold;
        this.#oksSigma = initialData.oks_sigma;
        this.#pointSizeBase = initialData.point_size_base as PointSizeBase;
        this.#lineThickness = initialData.line_thickness;
        this.#lowOverlapThreshold = initialData.low_overlap_threshold;
        this.#compareLineOrientation = initialData.compare_line_orientation;
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
    }

    get id(): number {
        return this.#id;
    }

    get taskId(): number {
        return this.#taskId;
    }

    get iouThreshold(): number {
        return this.#iouThreshold;
    }

    get oksSigma(): number {
        return this.#oksSigma;
    }

    get pointSizeBase(): PointSizeBase {
        return this.#pointSizeBase;
    }

    get lineThickness(): number {
        return this.#lineThickness;
    }

    get lowOverlapThreshold(): number {
        return this.#lowOverlapThreshold;
    }

    get compareLineOrientation(): boolean {
        return this.#compareLineOrientation;
    }

    get lineOrientationThreshold(): number {
        return this.#lineOrientationThreshold;
    }

    get compareGroups(): boolean {
        return this.#compareGroups;
    }

    get groupMatchThreshold(): number {
        return this.#groupMatchThreshold;
    }

    get checkCoveredAnnotations(): boolean {
        return this.#checkCoveredAnnotations;
    }

    get objectVisibilityThreshold(): number {
        return this.#objectVisibilityThreshold;
    }

    get panopticComparison(): boolean {
        return this.#panopticComparison;
    }

    get compareAttributes(): boolean {
        return this.#compareAttributes;
    }

    get targetMetric(): TargetMetric {
        return this.#targetMetric;
    }

    get targetMetricThreshold(): number {
        return this.#targetMetricThreshold;
    }

    get maxValidationsPerJob(): number {
        return this.#maxValidationsPerJob;
    }

    get emptyIsAnnotated(): boolean {
        return this.#emptyIsAnnotated;
    }

    get jobFilter(): string {
        return this.#jobFilter;
    }

    get inherit(): boolean {
        return this.#inherit;
    }

    get descriptions(): Record<string, string> {
        const descriptions: Record<string, string> = Object.keys(this.#descriptions).reduce((acc, key) => {
            const camelCaseKey = _.camelCase(key);
            acc[camelCaseKey] = this.#descriptions[key];
            return acc;
        }, {});

        return descriptions;
    }

    public async save(fields: QualitySettingsSaveFields = {}): Promise<QualitySettings> {
        const result = await PluginRegistry.apiWrapper.call(this, QualitySettings.prototype.save, fields);
        return result;
    }
}

Object.defineProperties(QualitySettings.prototype.save, {
    implementation: {
        writable: false,
        enumerable: false,
        value: async function implementation(
            fields: Parameters<typeof QualitySettings.prototype.save>[0],
        ): Promise<QualitySettings> {
            const data = fieldsToSnakeCase(fields);

            const result = await serverProxy.analytics.quality.settings.update(
                this.id, data,
            );
            const schema = await getServerAPISchema();
            const descriptions = convertDescriptions(schema.components.schemas.QualitySettings.properties);
            return new QualitySettings({ ...result, descriptions });
        },
    },
});
