// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Search from 'antd/lib/input/Search';

import { CombinedState, ProjectsQuery } from 'reducers/interfaces';
import { getProjectsAsync } from 'actions/projects-actions';

function getSearchField(gettingQuery: ProjectsQuery): string {
    let searchString = '';
    for (const field of Object.keys(gettingQuery)) {
        if (gettingQuery[field] !== null && field !== 'page') {
            if (field === 'search') {
                return (gettingQuery[field] as any) as string;
            }

            // not constant condition
            // eslint-disable-next-line
            if (typeof (gettingQuery[field] === 'number')) {
                searchString += `${field}:${gettingQuery[field]} AND `;
            } else {
                searchString += `${field}:"${gettingQuery[field]}" AND `;
            }
        }
    }

    return searchString.slice(0, -5);
}

export default function ProjectSearchField(): JSX.Element {
    const dispatch = useDispatch();
    const gettingQuery = useSelector((state: CombinedState) => state.projects.gettingQuery);

    const handleSearch = (value: string): void => {
        const query = { ...gettingQuery };
        const search = value.replace(/\s+/g, ' ').replace(/\s*:+\s*/g, ':').trim();

        const fields = Object.keys(query).filter((key) => key !== 'page');
        for (const field of fields) {
            query[field] = null;
        }
        query.search = null;

        let specificRequest = false;
        for (const param of search.split(/[\s]+and[\s]+|[\s]+AND[\s]+/)) {
            if (param.includes(':')) {
                const [field, fieldValue] = param.split(':');
                if (fields.includes(field) && !!fieldValue) {
                    specificRequest = true;
                    if (field === 'id') {
                        if (Number.isInteger(+fieldValue)) {
                            query[field] = +fieldValue;
                        }
                    } else {
                        query[field] = fieldValue;
                    }
                }
            }
        }

        query.page = 1;
        if (!specificRequest && value) {
            query.search = value;
        }

        dispatch(getProjectsAsync(query));
    };

    return (
        <Search
            defaultValue={getSearchField(gettingQuery)}
            onSearch={handleSearch}
            size='large'
            placeholder='Search'
        />
    );
}
