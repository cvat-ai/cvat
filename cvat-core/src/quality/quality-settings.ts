// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { SerializedQualitySettingsData, SerializedQualitySettingsSaveData } from './server-response-types';
import PluginRegistry from '../plugins';
import serverProxy from '../server-proxy';
import { convertDescriptions, getServerAPISchema } from '../server-schema';
import { fieldsToCamelCase, fieldsToSnakeCase } from '../common';
import { Camelized } from '../type-utils';
import QualityRequirement from './quality-requirement';

export type QualitySettingsSaveFields = Camelized<SerializedQualitySettingsSaveData>;

export async function getQualitySettingsSchemaDescriptions(): Promise<{
    descriptions: Record<string, string>;
    requirementDescriptions: Record<string, string>;
}> {
    const schema = await getServerAPISchema();
    return {
        descriptions: convertDescriptions(schema.components.schemas.QualitySettings.properties),
        requirementDescriptions: convertDescriptions(schema.components.schemas.QualityRequirement.properties),
    };
}

export default class QualitySettings {
    #id: number;
    #maxValidationsPerJob: number;
    #taskId: number;
    #projectId: number;
    #jobFilter: string;
    #inherit: boolean;
    #requirements: QualityRequirement[];
    #descriptions: Record<string, string>;
    #requirementDescriptions: Record<string, string>;

    constructor(initialData: SerializedQualitySettingsData) {
        this.#id = initialData.id;
        this.#taskId = initialData.task_id;
        this.#projectId = initialData.project_id;
        this.#maxValidationsPerJob = initialData.max_validations_per_job;
        this.#jobFilter = initialData.job_filter || '';
        this.#inherit = initialData.inherit;
        this.#requirements = (initialData.requirements || []).map((requirement) => (
            new QualityRequirement(requirement)
        ));
        this.#descriptions = initialData.descriptions || {};
        this.#requirementDescriptions = initialData.requirement_descriptions || {};
    }

    get id(): number {
        return this.#id;
    }

    get taskId(): number {
        return this.#taskId;
    }

    get projectId(): number {
        return this.#projectId;
    }

    get maxValidationsPerJob(): number {
        return this.#maxValidationsPerJob;
    }

    get jobFilter(): string {
        return this.#jobFilter;
    }

    get inherit(): boolean {
        return this.#inherit;
    }

    get requirements(): QualityRequirement[] {
        return this.#requirements;
    }

    get descriptions(): Record<string, string> {
        return fieldsToCamelCase(this.#descriptions);
    }

    get requirementDescriptions(): Record<string, string> {
        return fieldsToCamelCase(this.#requirementDescriptions);
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
            const { descriptions, requirementDescriptions } = await getQualitySettingsSchemaDescriptions();
            return new QualitySettings({
                ...result,
                descriptions,
                requirement_descriptions: requirementDescriptions,
            });
        },
    },
});
