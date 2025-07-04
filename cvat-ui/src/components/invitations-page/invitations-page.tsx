// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React, { useEffect } from 'react';
import { useHistory } from 'react-router';
import { useDispatch, useSelector } from 'react-redux';
import Spin from 'antd/lib/spin';
import { CombinedState, InvitationsQuery } from 'reducers';
import { useIsMounted, useResourceQuery } from 'utils/hooks';
import { getInvitationsAsync } from 'actions/invitations-actions';
import { updateHistoryFromQuery } from 'components/resource-sorting-filtering';
import EmptyListComponent from './empty-list';
import InvitationsListComponent from './invitations-list';

export default function InvitationsPageComponent(): JSX.Element {
    const dispatch = useDispatch();
    const history = useHistory();
    const isMounted = useIsMounted();

    const fetching = useSelector((state: CombinedState) => state.invitations.fetching);
    const query = useSelector((state: CombinedState) => state.invitations.query);
    const count = useSelector((state: CombinedState) => state.invitations.count);

    const updatedQuery = useResourceQuery<InvitationsQuery>(query);

    useEffect(() => {
        dispatch(getInvitationsAsync(updatedQuery));
    }, []);

    useEffect(() => {
        if (isMounted()) {
            history.replace({
                search: updateHistoryFromQuery(query),
            });
        }
    }, [query]);

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
