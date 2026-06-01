// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import _ from 'lodash';
import {
    SerializedQualitySettingsData,
    SerializedTranscriptionRequirement,
} from './server-response-types';
import PluginRegistry from './plugins';
import serverProxy from './server-proxy';
import { convertDescriptions, getServerAPISchema } from './server-schema';
import { fieldsToSnakeCase } from './common';
import { Camelized } from './type-utils';

export enum TargetMetric {
    ACCURACY = 'accuracy',
    PRECISION = 'precision',
    RECALL = 'recall',
    TRANSCRIPTION_ERROR_RATE = 'transcription_error_rate',
}

export enum PointSizeBase {
    IMAGE_SIZE = 'image_size',
    GROUP_BBOX_SIZE = 'group_bbox_size',
}

export enum TranscriptionGranularity {
    WORD = 'word',
    CHARACTER = 'character',
}

export enum TranscriptionMetric {
    EQUALITY = 'equality',
    ERROR_RATE = 'error-rate',
    NORMALIZED_LEV = 'normalized-lev',
}

export enum TranscriptionAlignMode {
    CHAR = 'char',
    WORD = 'word',
}

export enum TranscriptionGroupingStrategy {
    FILTER = 'filter',
    JOIN = 'join',
}

// Metrics whose soft cost can be binarized by `metricThreshold`; `equality` is a
// hard bit metric and ignores it.
export const METRICS_SUPPORTING_THRESHOLD: readonly TranscriptionMetric[] = [
    TranscriptionMetric.ERROR_RATE,
    TranscriptionMetric.NORMALIZED_LEV,
];

export type QualitySettingsSaveFields = Partial<Camelized<
    Omit<SerializedQualitySettingsData, 'id' | 'task_id' | 'descriptions' | 'transcription_requirements'>
>> & {
    // Sent as already-snake-cased entries; fieldsToSnakeCase only converts the
    // top-level key, not the array contents.
    transcriptionRequirements?: SerializedTranscriptionRequirement[];
};

export class TranscriptionRequirement {
    #attributeId: number;
    #granularity: TranscriptionGranularity;
    #metric: TranscriptionMetric;
    #alignment: TranscriptionAlignMode;
    #metricThreshold: number | null;
    #groupingStrategy: TranscriptionGroupingStrategy;
    #groupingSeparator: string;
    #groupingAttributeId: number | null;
    #acceptanceThreshold: number;

    constructor(initialData: SerializedTranscriptionRequirement) {
        this.#attributeId = initialData.attribute_id;
        this.#granularity = initialData.granularity as TranscriptionGranularity;
        this.#metric = initialData.metric as TranscriptionMetric;
        this.#alignment = initialData.alignment as TranscriptionAlignMode;
        this.#metricThreshold = initialData.metric_threshold ?? null;
        this.#groupingStrategy = initialData.grouping_strategy as TranscriptionGroupingStrategy;
        this.#groupingSeparator = initialData.grouping_separator;
        this.#groupingAttributeId = initialData.grouping_attribute_id ?? null;
        this.#acceptanceThreshold = initialData.acceptance_threshold;
    }

    get attributeId(): number { return this.#attributeId; }
    get granularity(): TranscriptionGranularity { return this.#granularity; }
    get metric(): TranscriptionMetric { return this.#metric; }
    get alignment(): TranscriptionAlignMode { return this.#alignment; }
    get metricThreshold(): number | null { return this.#metricThreshold; }
    get groupingStrategy(): TranscriptionGroupingStrategy { return this.#groupingStrategy; }
    get groupingSeparator(): string { return this.#groupingSeparator; }
    get groupingAttributeId(): number | null { return this.#groupingAttributeId; }
    get acceptanceThreshold(): number { return this.#acceptanceThreshold; }

    public toJSON(): SerializedTranscriptionRequirement {
        return {
            attribute_id: this.#attributeId,
            granularity: this.#granularity,
            metric: this.#metric,
            alignment: this.#alignment,
            metric_threshold: this.#metricThreshold,
            grouping_strategy: this.#groupingStrategy,
            grouping_separator: this.#groupingSeparator,
            grouping_attribute_id: this.#groupingAttributeId,
            acceptance_threshold: this.#acceptanceThreshold,
        };
    }
}

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
    #intervalBoundaryTolerance: number;
    #compareLineOrientation: boolean;
    #lineOrientationThreshold: number;
    #compareGroups: boolean;
    #groupMatchThreshold: number;
    #checkCoveredAnnotations: boolean;
    #objectVisibilityThreshold: number;
    #panopticComparison: boolean;
    #compareAttributes: boolean;
    #emptyIsAnnotated: boolean;
    #transcriptionRequirements: TranscriptionRequirement[];
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
        this.#intervalBoundaryTolerance = initialData.interval_boundary_tolerance;
        this.#compareLineOrientation = initialData.compare_line_orientation;
        this.#lineOrientationThreshold = initialData.line_orientation_threshold;
        this.#compareGroups = initialData.compare_groups;
        this.#groupMatchThreshold = initialData.group_match_threshold;
        this.#checkCoveredAnnotations = initialData.check_covered_annotations;
        this.#objectVisibilityThreshold = initialData.object_visibility_threshold;
        this.#panopticComparison = initialData.panoptic_comparison;
        this.#compareAttributes = initialData.compare_attributes;
        this.#emptyIsAnnotated = initialData.empty_is_annotated;
        this.#transcriptionRequirements = (initialData.transcription_requirements ?? [])
            .map((requirement) => new TranscriptionRequirement(requirement));
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

    get intervalBoundaryTolerance(): number {
        return this.#intervalBoundaryTolerance;
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

    get transcriptionRequirements(): TranscriptionRequirement[] {
        return this.#transcriptionRequirements;
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
