// Copyright (C) 2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React, { useEffect } from 'react';
import { useHistory } from 'react-router';
import { useDispatch, useSelector } from 'react-redux';
import Spin from 'antd/lib/spin';

import { CombinedState } from 'reducers/interfaces';
import { getJobsAsync } from 'actions/jobs-actions';

import TopBarComponent from './top-bar';
import JobsContentComponent from './jobs-content';

function JobsPageComponent(): JSX.Element {
    const dispatch = useDispatch();
    const query = useSelector((state: CombinedState) => state.jobs.query);
    const fetching = useSelector((state: CombinedState) => state.jobs.fetching);
    const history = useHistory();

    useEffect(() => {
        // get relevant query parameters from the url and fetch jobs according to them
        const { location } = history;
        const searchParams = new URLSearchParams(location.search);
        const copiedQuery = { ...query };
        for (const [key, value] of searchParams.entries()) {
            if (key in copiedQuery) {
                copiedQuery[key] = key === 'page' ? +value : value;
            }
        }

        dispatch(getJobsAsync(query));
    }, []);

    useEffect(() => {
        // when query is updated, set relevant search params to url
        const searchParams = new URLSearchParams();
        const { location } = history;
        for (const [key, value] of Object.entries(query)) {
            if (value) {
                searchParams.set(key, value.toString());
            }
        }

        history.push(`${location.pathname}?${searchParams.toString()}`);
    }, [query]);

    if (fetching) {
        return (
            <div className='cvat-jobs-page'>
                <Spin size='large' className='cvat-spinner' />
            </div>
        );
    }

    return (
        <div className='cvat-jobs-page'>
            <TopBarComponent />
            <JobsContentComponent />
        </div>
    );
}

export default React.memo(JobsPageComponent);
