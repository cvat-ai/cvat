// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { Indexable } from 'reducers';
import { filterNull } from './filter-null';

export function authQuery(queryParams: URLSearchParams): Record<string, string> | null {
    const updatedQuery: Record<string, string | null> = {
        email: null,
        invitation: null,
    };
    for (const key of Object.keys(updatedQuery)) {
        (updatedQuery as Indexable)[key] = queryParams.get(key) || null;
    }

    if (Object.values(updatedQuery).some((val) => !!val)) {
        const searchObject = filterNull(updatedQuery) as Record<string, string>;
        return searchObject;
    }

    return null;
}
