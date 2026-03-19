// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

interface PaginationFilter {
    page?: number;
    page_size?: number;
    [key: string]: any;
}

interface PaginatedResult<T> {
    count: number;
    [Symbol.iterator](): Iterator<T>;
}

interface PaginatedFetcher<T> {
    (filter: PaginationFilter): Promise<PaginatedResult<T>>;
}

export async function fetchAllPaginated<T>(
    fetcher: PaginatedFetcher<T>,
    filter: PaginationFilter = {},
    pageSize: number = 500,
): Promise<{ items: T[], count: number }> {
    if ('page' in filter || 'pageSize' in filter) {
        const result = await fetcher(filter);
        const items = Array.from(result) as T[];
        return { items, count: result.count };
    }

    const allItems: T[] = [];
    let totalCount = 0;

    const firstPageFilter = { ...filter, page: 1, page_size: pageSize };
    const firstPage = await fetcher(firstPageFilter);
    const firstPageItems = Array.from(firstPage) as T[];
    allItems.push(...firstPageItems);
    totalCount = firstPage.count;

    if (totalCount > pageSize) {
        const totalPages = Math.ceil(totalCount / pageSize);
        const remainingPagePromises = [];

        for (let page = 2; page <= totalPages; page++) {
            const pageFilter = { ...filter, page, page_size: pageSize };
            remainingPagePromises.push(fetcher(pageFilter));
        }

        const remainingPages = await Promise.all(remainingPagePromises);

        for (const page of remainingPages) {
            const pageItems = Array.from(page) as T[];
            allItems.push(...pageItems);
        }
    }

    return { items: allItems, count: totalCount };
}
