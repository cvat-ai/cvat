// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React, { useEffect } from 'react';
import { useHistory } from 'react-router';
import { useDispatch, useSelector } from 'react-redux';
import Spin from 'antd/lib/spin';
import { CombinedState, Indexable } from 'reducers';
import { getInvitationsAsync } from 'actions/invitations-actions';
import EmptyListComponent from './empty-list';
import InvitationsListComponent from './invitations-list';

export default function InvitationsPageComponent(): JSX.Element {
    const dispatch = useDispatch();
    const history = useHistory();
    const fetching = useSelector((state: CombinedState) => state.invitations.fetching);
    const invitations = useSelector((state: CombinedState) => state.invitations.invitations);
    const query = useSelector((state: CombinedState) => state.invitations.query);
    const count = invitations.length;

    const updatedQuery = { ...query };
    const queryParams = new URLSearchParams(history.location.search);
    for (const key of Object.keys(updatedQuery)) {
        (updatedQuery as Indexable)[key] = queryParams.get(key) || null;
        if (key === 'page') {
            updatedQuery.page = updatedQuery.page ? +updatedQuery.page : 1;
        }
    }

    useEffect(() => {
        dispatch(getInvitationsAsync());
    }, []);

    const content = count ? <InvitationsListComponent query={updatedQuery} /> : <EmptyListComponent />;

    return (
        <div className='cvat-invitations-page'>
            { fetching ? (
                <div className='cvat-empty-invitations-list'>
                    <Spin size='large' className='cvat-spinner' />
                </div>
            ) : content }
        </div>
    );
}
