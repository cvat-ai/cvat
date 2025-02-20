// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { SerializedAPISchema } from 'server-response-types';
import serverProxy from './server-proxy';

let schemaCache: SerializedAPISchema | null = null;

export async function getServerAPISchema(): Promise<SerializedAPISchema> {
    if (schemaCache) {
        return schemaCache;
    }

    schemaCache = await serverProxy.server.apiSchema();
    return schemaCache;
}

export function convertDescriptions(descriptions: Record<string, { description?: string }>): Record<string, string> {
    return Object.keys(descriptions).reduce((acc, key) => {
        acc[key] = descriptions[key].description ?? '';
        return acc;
    }, {} as Record<string, string>);
}
