// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React from 'react';
import Search from 'antd/lib/input/Search';
import SearchTooltip from 'components/search-tooltip/search-tooltip';

interface Query {
    [key: string]: string | number | boolean | null | undefined;
}

interface Props {
    query: Query;
    instance: 'task' | 'project' | 'cloudstorage';
    skipFields?: string[];
    onSearch(query: object): void;
}

export default function SearchField(props: Props): JSX.Element {
    const {
        onSearch,
        query,
        instance,
        skipFields,
    } = props;
    const skip = ['page'];
    if (typeof skipFields !== 'undefined') {
        skip.push(...skipFields);
    }

    function parse(_query: Query, _skip: string[]): string {
        let searchString = '';
        for (const field of Object.keys(_query)) {
            const value = _query[field];
            if (value !== null && typeof value !== 'undefined' && !_skip.includes(field)) {
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

        const fields = Object.keys(query).filter((key) => !skip.includes(key));
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

        currentQuery.page = 1;
        if (!specificRequest && value) {
            currentQuery.search = value;
        }

        onSearch(currentQuery);
    };

    return (
        <SearchTooltip instance={instance}>
            <Search
                className='cvat-search-field'
                defaultValue={parse(query, skip)}
                onSearch={handleSearch}
                size='large'
                placeholder='Search'
            />
        </SearchTooltip>
    );
}
