// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import Search from 'antd/lib/input/Search';

interface Query {
    [key: string]: string | number | null | undefined;
}

interface Props {
    onSearch(query: object): void;
    query: Query;
}

export default function SearchField(props: Props): JSX.Element {
    const { onSearch, query } = props;
    function parse(_query: Query): string {
        let searchString = '';
        for (const field of Object.keys(_query)) {
            const value = _query[field];
            if (value !== null && typeof value !== 'undefined' && field !== 'page') {
                if (field === 'search') {
                    return _query[field] as string;
                }

                // eslint-disable-next-line
                if (typeof (_query[field] === 'number')) {
                    searchString += `${field}: ${_query[field]} AND `;
                } else {
                    searchString += `${field}: "${_query[field]}" AND `;
                }
            }
        }

        return searchString.slice(0, -5);
    }

    const handleSearch = (value: string): void => {
        const currentQuery = { ...query };
        const search = value
            .replace(/\s+/g, ' ')
            .replace(/\s*:+\s*/g, ':')
            .trim();

        const fields = Object.keys(query).filter((key) => key !== 'page');
        for (const field of fields) {
            currentQuery[field] = null;
        }
        currentQuery.search = null;

        let specificRequest = false;
        for (const param of search.split(/[\s]+and[\s]+|[\s]+AND[\s]+/)) {
            if (param.includes(':')) {
                const [field, fieldValue] = param.split(':');
                if (fields.includes(field) && !!fieldValue) {
                    specificRequest = true;
                    if (field === 'id') {
                        if (Number.isInteger(+fieldValue)) {
                            currentQuery[field] = +fieldValue;
                        }
                    } else {
                        currentQuery[field] = fieldValue;
                    }
                }
            }
        }

        query.page = 1;
        if (!specificRequest && value) {
            query.search = value;
        }

        onSearch(query);
    };

    return (
        <Search
            className='cvat-search-field'
            defaultValue={parse(query)}
            onSearch={handleSearch}
            size='large'
            placeholder='Search'
        />
    );
}
