// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { useHistory } from 'react-router';
import { useResourceQuery } from 'utils/hooks';

interface ResourceQueryDefaultParams {
    page?: number;
    pageSize?: number;
    filter?: string;
}

export function useResourceFilteringQuery<QueryType extends {
    page: number;
    pageSize: number;
    filter: string;
}>(query: QueryType, defaultParams: ResourceQueryDefaultParams = {}): QueryType {
    const {
        filter = '{}',
    } = defaultParams;

    const updatedQuery = useResourceQuery<QueryType>(query, defaultParams);

    const history = useHistory();
    const queryParams = new URLSearchParams(history.location.search);

    const queryFilter = queryParams.get('filter') || null;
    updatedQuery.filter = queryFilter || filter;

    return updatedQuery;
}
