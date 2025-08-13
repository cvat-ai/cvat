// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import { useSelector } from 'react-redux';
import React, { useEffect } from 'react';
import { CombinedState, RequestsQuery } from 'reducers';
import { useHistory } from 'react-router';

import Spin from 'antd/lib/spin';

import { updateHistoryFromQuery } from 'components/resource-sorting-filtering';
import { useResourceQuery } from 'utils/hooks';
import EmptyListComponent from './empty-list';
import RequestsList from './requests-list';

export default function RequestsPageComponent(): JSX.Element {
    const history = useHistory();
    const { fetching, query, requests } = useSelector((state: CombinedState) => state.requests);

    const count = Object.keys(requests).length;
    const updatedQuery = useResourceQuery<RequestsQuery>(query);

    useEffect(() => {
        history.replace({
            search: updateHistoryFromQuery(query),
        });
    }, [query]);

    const pageOutOfBounds = updatedQuery.page ? updatedQuery.page > Math.ceil(count / query.pageSize) : false;
    const content = (count && !pageOutOfBounds) ? (
        <RequestsList query={updatedQuery} count={count} />
    ) : <EmptyListComponent />;

    return (
        <div className='cvat-requests-page'>
            { fetching ? (
                <div>
                    <Spin size='large' className='cvat-spinner' />
                </div>
            ) : content }
        </div>
    );
}
