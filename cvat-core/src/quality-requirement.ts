// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import PluginRegistry from './plugins';
import serverProxy from './server-proxy';
import { fieldsToSnakeCase } from './common';
import { CamelizedV2 } from './type-utils';
import {
    SerializedEffectiveQualityRequirementData,
    SerializedQualityRequirementAttributeComparison,
    SerializedQualityRequirementData,
    QualityRequirementAnnotationType,
    QualityRequirementJsonLogicFilter,
    QualityRequirementMetric,
    QualityRequirementPointSizeBase,
} from './server-response-types';

export type QualityRequirementSaveFields = Partial<CamelizedV2<
    Omit<
        SerializedQualityRequirementData,
        'id' | 'task_id' | 'project_id' | 'is_default' | 'effective' | 'created_date' | 'updated_date'
    >
>>;

export type QualityRequirementEffectiveData = CamelizedV2<SerializedEffectiveQualityRequirementData>;

export default class QualityRequirement {
    #id?: number;
    #settingsId?: number;
    #taskId: number | null;
    #projectId: number | null;
    #name: string;
    #isDefault: boolean;
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
    #matchAttributes: boolean | null;
    #attributeComparison: SerializedQualityRequirementAttributeComparison | null;
    #emptyIsAnnotated: boolean | null;
    #createdDate?: string;
    #updatedDate?: string;

    constructor(initialData: SerializedQualityRequirementData = {}) {
        this.#id = initialData.id;
        this.#settingsId = initialData.settings_id;
        this.#taskId = initialData.task_id ?? null;
        this.#projectId = initialData.project_id ?? null;
        this.#name = initialData.name ?? '';
        this.#isDefault = initialData.is_default ?? false;
        this.#sortOrder = initialData.sort_order ?? 0;
        this.#filter = initialData.filter ?? '';
        this.#enabled = initialData.enabled ?? true;
        this.#annotationType = initialData.annotation_type ?? null;
        this.#metric = initialData.metric ?? null;
        this.#requiredScore = initialData.required_score ?? null;
        this.#parentRequirementId = initialData.parent_requirement ?? null;
        this.#effective = initialData.effective ? fieldsToCamelCase(initialData.effective) : null;
        this.#iouThreshold = initialData.iou_threshold ?? null;
        this.#pointSize = initialData.point_size ?? null;
        this.#pointSizeBase = initialData.point_size_base ?? null;
        this.#lineThickness = initialData.line_thickness ?? null;
        this.#matchOrientation = initialData.match_orientation ?? null;
        this.#lineOrientationThreshold = initialData.line_orientation_threshold ?? null;
        this.#matchGroups = initialData.match_groups ?? null;
        this.#groupMatchThreshold = initialData.group_match_threshold ?? null;
        this.#checkCoveredAnnotations = initialData.check_covered_annotations ?? null;
        this.#objectVisibilityThreshold = initialData.object_visibility_threshold ?? null;
        this.#panopticComparison = initialData.panoptic_comparison ?? null;
        this.#matchAttributes = initialData.match_attributes ?? null;
        this.#attributeComparison = initialData.attribute_comparison ?? null;
        this.#emptyIsAnnotated = initialData.empty_is_annotated ?? null;
        this.#createdDate = initialData.created_date;
        this.#updatedDate = initialData.updated_date;
    }

    get id(): number | undefined {
        return this.#id;
    }

    get settingsId(): number | undefined {
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

    get isDefault(): boolean {
        return this.#isDefault;
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

    get matchAttributes(): boolean | null {
        return this.#matchAttributes;
    }

    get attributeComparison(): SerializedQualityRequirementAttributeComparison | null {
        return this.#attributeComparison;
    }

    get emptyIsAnnotated(): boolean | null {
        return this.#emptyIsAnnotated;
    }

    get createdDate(): string | undefined {
        return this.#createdDate;
    }

    get updatedDate(): string | undefined {
        return this.#updatedDate;
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

function fieldsToCamelCase<T extends object>(data: T): CamelizedV2<T> {
    return Object.entries(data).reduce((acc, [key, value]) => {
        const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
        acc[camelKey] = value;
        return acc;
    }, {} as Record<string, unknown>) as CamelizedV2<T>;
}

Object.defineProperties(QualityRequirement.prototype.save, {
    implementation: {
        writable: false,
        enumerable: false,
        value: async function implementation(
            fields: Parameters<typeof QualityRequirement.prototype.save>[0],
        ): Promise<QualityRequirement> {
            const data = fieldsToSnakeCase(fields);
            const result = typeof this.id === 'number' ?
                await serverProxy.analytics.quality.requirements.update(this.id, data) :
                await serverProxy.analytics.quality.requirements.create(data);

            return new QualityRequirement({ ...result });
        },
    },
});

Object.defineProperties(QualityRequirement.prototype.delete, {
    implementation: {
        writable: false,
        enumerable: false,
        value: async function implementation(): Promise<void> {
            if (typeof this.id !== 'number') {
                return;
            }

            await serverProxy.analytics.quality.requirements.delete(this.id);
        },
    },
});
