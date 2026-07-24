// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import PluginRegistry from '../plugins';
import serverProxy from '../server-proxy';
import { fieldsToCamelCase, fieldsToSnakeCase } from '../common';
import { CamelizedV2 } from '../type-utils';
import {
    SerializedEffectiveQualityRequirementData,
    SerializedQualityRequirementAttributeComparison,
    SerializedQualityRequirementData,
    SerializedQualityRequirementSaveData,
    QualityRequirementAnnotationType,
    QualityRequirementJsonLogicFilter,
    QualityRequirementMetric,
    QualityRequirementPointSizeBase,
} from './server-response-types';

export type QualityRequirementSaveFields = CamelizedV2<SerializedQualityRequirementSaveData>;

export type QualityRequirementEffectiveData = CamelizedV2<SerializedEffectiveQualityRequirementData>;

export default class QualityRequirement {
    #id: number;
    #settingsId: number;
    #taskId: number | null;
    #projectId: number | null;
    #name: string;
    #isBase: boolean;
    #sortOrder: number;
    #filter: QualityRequirementJsonLogicFilter;
    #enabled: boolean;
    #annotationType: QualityRequirementAnnotationType | null;
    #metric: QualityRequirementMetric | null;
    #requiredScore: number | null;
    #parentRequirementId: number | null;
    #effective: QualityRequirementEffectiveData | null;
    #iouThreshold: number | null;
    #pointSize: number | null;
    #pointSizeBase: QualityRequirementPointSizeBase | null;
    #lineThickness: number | null;
    #matchOrientation: boolean | null;
    #lineOrientationThreshold: number | null;
    #matchGroups: boolean | null;
    #groupMatchThreshold: number | null;
    #checkCoveredAnnotations: boolean | null;
    #objectVisibilityThreshold: number | null;
    #panopticComparison: boolean | null;
    #attributeComparison: SerializedQualityRequirementAttributeComparison | null;
    #emptyIsAnnotated: boolean | null;
    #createdDate: string;
    #updatedDate: string;

    constructor(initialData: SerializedQualityRequirementData) {
        this.#id = initialData.id;
        this.#settingsId = initialData.settings_id;
        this.#taskId = initialData.task_id;
        this.#projectId = initialData.project_id;
        this.#name = initialData.name;
        this.#isBase = initialData.is_base;
        this.#sortOrder = initialData.sort_order;
        this.#filter = initialData.filter;
        this.#enabled = initialData.enabled;
        this.#annotationType = initialData.annotation_type;
        this.#metric = initialData.metric;
        this.#requiredScore = initialData.required_score;
        this.#parentRequirementId = initialData.parent_requirement;
        this.#effective = initialData.effective ? fieldsToCamelCase(initialData.effective) : null;
        this.#iouThreshold = initialData.iou_threshold;
        this.#pointSize = initialData.point_size;
        this.#pointSizeBase = initialData.point_size_base;
        this.#lineThickness = initialData.line_thickness;
        this.#matchOrientation = initialData.match_orientation;
        this.#lineOrientationThreshold = initialData.line_orientation_threshold;
        this.#matchGroups = initialData.match_groups;
        this.#groupMatchThreshold = initialData.group_match_threshold;
        this.#checkCoveredAnnotations = initialData.check_covered_annotations;
        this.#objectVisibilityThreshold = initialData.object_visibility_threshold;
        this.#panopticComparison = initialData.panoptic_comparison;
        this.#attributeComparison = initialData.attribute_comparison;
        this.#emptyIsAnnotated = initialData.empty_is_annotated;
        this.#createdDate = initialData.created_date;
        this.#updatedDate = initialData.updated_date;
    }

    get id(): number {
        return this.#id;
    }

    get settingsId(): number {
        return this.#settingsId;
    }

    get taskId(): number | null {
        return this.#taskId;
    }

    get projectId(): number | null {
        return this.#projectId;
    }

    get name(): string {
        return this.#name;
    }

    get isBase(): boolean {
        return this.#isBase;
    }

    get sortOrder(): number {
        return this.#sortOrder;
    }

    get filter(): QualityRequirementJsonLogicFilter {
        return this.#filter;
    }

    get enabled(): boolean {
        return this.#enabled;
    }

    get annotationType(): QualityRequirementAnnotationType | null {
        return this.#annotationType;
    }

    get metric(): QualityRequirementMetric | null {
        return this.#metric;
    }

    get requiredScore(): number | null {
        return this.#requiredScore;
    }

    get parentRequirementId(): number | null {
        return this.#parentRequirementId;
    }

    get effective(): QualityRequirementEffectiveData | null {
        return this.#effective;
    }

    get iouThreshold(): number | null {
        return this.#iouThreshold;
    }

    get pointSize(): number | null {
        return this.#pointSize;
    }

    get pointSizeBase(): QualityRequirementPointSizeBase | null {
        return this.#pointSizeBase;
    }

    get lineThickness(): number | null {
        return this.#lineThickness;
    }

    get matchOrientation(): boolean | null {
        return this.#matchOrientation;
    }

    get lineOrientationThreshold(): number | null {
        return this.#lineOrientationThreshold;
    }

    get matchGroups(): boolean | null {
        return this.#matchGroups;
    }

    get groupMatchThreshold(): number | null {
        return this.#groupMatchThreshold;
    }

    get checkCoveredAnnotations(): boolean | null {
        return this.#checkCoveredAnnotations;
    }

    get objectVisibilityThreshold(): number | null {
        return this.#objectVisibilityThreshold;
    }

    get panopticComparison(): boolean | null {
        return this.#panopticComparison;
    }

    get attributeComparison(): SerializedQualityRequirementAttributeComparison | null {
        return this.#attributeComparison;
    }

    get emptyIsAnnotated(): boolean | null {
        return this.#emptyIsAnnotated;
    }

    get createdDate(): string {
        return this.#createdDate;
    }

    get updatedDate(): string {
        return this.#updatedDate;
    }

    static async create(fields: QualityRequirementSaveFields): Promise<QualityRequirement> {
        const result = await PluginRegistry.apiWrapper.call(this, QualityRequirement.create, fields);
        return result;
    }

    public async save(fields: QualityRequirementSaveFields = {}): Promise<QualityRequirement> {
        const result = await PluginRegistry.apiWrapper.call(this, QualityRequirement.prototype.save, fields);
        return result;
    }

    public async delete(): Promise<void> {
        const result = await PluginRegistry.apiWrapper.call(this, QualityRequirement.prototype.delete);
        return result;
    }
}

Object.defineProperties(QualityRequirement.create, {
    implementation: {
        writable: false,
        enumerable: false,
        value: async function implementation(
            fields: QualityRequirementSaveFields,
        ): Promise<QualityRequirement> {
            const data = fieldsToSnakeCase(fields);
            const result = await serverProxy.analytics.quality.requirements.create(data);
            return new QualityRequirement(result);
        },
    },
});

Object.defineProperties(QualityRequirement.prototype.save, {
    implementation: {
        writable: false,
        enumerable: false,
        value: async function implementation(
            fields: Parameters<typeof QualityRequirement.prototype.save>[0],
        ): Promise<QualityRequirement> {
            const data = fieldsToSnakeCase(fields);
            const result = await serverProxy.analytics.quality.requirements.update(this.id, data);

            return new QualityRequirement(result);
        },
    },
});

Object.defineProperties(QualityRequirement.prototype.delete, {
    implementation: {
        writable: false,
        enumerable: false,
        value: async function implementation(): Promise<void> {
            await serverProxy.analytics.quality.requirements.delete(this.id);
        },
    },
});
