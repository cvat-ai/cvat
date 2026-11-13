// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import _ from 'lodash';
import jsonLogic from 'json-logic-js';

import { MLModel, ModelProviders } from 'cvat-core-wrapper';
import { ModelsQuery } from 'reducers';

interface ModelData {
    id: string;
    name: string;
    provider: string;
    kind: string;
    owner: string;
    description: string;
    created_date: string;
    updated_date: string;
    labels: string;
}

interface ModelEntry {
    model: MLModel;
    data: ModelData;
}

function modelData(model: MLModel): ModelData {
    return {
        id: String(model.id),
        name: model.name,
        provider: model.provider,
        kind: model.displayKind,
        owner: model.owner,
        description: model.description ?? '',
        created_date: model.createdDate ?? '',
        updated_date: model.updatedDate ?? '',
        labels: model.labels.map((label) => label.name).join(' '),
    };
}

function defaultOrder(models: MLModel[]): MLModel[] {
    const builtInModels = models.filter((model) => model.provider === ModelProviders.CVAT);
    const externalModels = models
        .filter((model) => model.provider !== ModelProviders.CVAT)
        .sort((left, right) => (
            new Date(left.createdDate || 0).valueOf() - new Date(right.createdDate || 0).valueOf()
        ));

    return [...builtInModels, ...externalModels];
}

export function filterModels(models: MLModel[], query: ModelsQuery): MLModel[] {
    let entries: ModelEntry[] = models.map((model) => ({ model, data: modelData(model) }));

    if (query.search) {
        const phrase = query.search.trim().toLowerCase();
        if (phrase) {
            entries = entries.filter(({ data }) => Object.values(data)
                .some((value) => String(value).toLowerCase().includes(phrase)));
        }
    }

    if (query.filter) {
        try {
            const filter = JSON.parse(query.filter);
            entries = entries.filter(({ data }) => jsonLogic.apply(filter, data));
        } catch (_error) {
            // Ignore malformed filters supplied manually in the URL.
        }
    }

    if (!query.sort) {
        return defaultOrder(entries.map(({ model }) => model));
    }

    const fields = query.sort.split(',').filter(Boolean);
    const orders = fields.map((field) => (field.startsWith('-') ? 'desc' : 'asc'));
    const iteratees = fields.map((field) => {
        const key = field.replace(/^-/, '') as keyof ModelData;
        return ({ data, model }: ModelEntry): string | number => {
            if (key === 'id' && typeof model.id === 'number') {
                return model.id;
            }
            const value = data[key];
            return typeof value === 'string' ? value.toLowerCase() : value;
        };
    });

    return _.orderBy(entries, iteratees, orders).map(({ model }) => model);
}
