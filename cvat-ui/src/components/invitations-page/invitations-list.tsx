// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useCallback } from 'react';
import { useSelector, useDispatch, shallowEqual } from 'react-redux';
import { Row, Col } from 'antd/lib/grid';
import Pagination from 'antd/lib/pagination';

import { CombinedState, InvitationsQuery } from 'reducers';
import { Invitation } from 'cvat-core/src/organization';
import { acceptInvitationAsync, getInvitationsAsync, declineInvitationAsync } from 'actions/invitations-actions';
import dimensions from 'utils/dimensions';
import InvitationItem from './invitation-item';

interface Props {
    query: InvitationsQuery;
}

export default function InvitationsListComponent(props: Props): JSX.Element {
    const { query } = props;

    const dispatch = useDispatch();
    const { invitations, totalCount } = useSelector((state: CombinedState) => ({
        invitations: state.invitations.current,
        totalCount: state.invitations.count,
    }), shallowEqual);

    const onAccept = useCallback((invitationKey) => (
        dispatch(acceptInvitationAsync(invitationKey, (orgSlug: string) => {
            localStorage.setItem('currentOrganization', orgSlug);
            window.location.reload();
        }))), []);

    const onDecline = useCallback((invitationKey) => (
        dispatch(declineInvitationAsync(invitationKey))
    ), []);

    const onPageChange = useCallback((newPage: number, newPageSize: number) => {
        dispatch(getInvitationsAsync({
            ...query,
            page: newPage,
            pageSize: newPageSize,
        }));
    }, [query]);

    return (
        <>
            <Row justify='center' align='top' className='cvat-resource-list-wrapper cvat-invitations-list-content'>
                <Col className='cvat-invitations-list' {...dimensions}>
                    {invitations.map(
                        (invitation: Invitation): JSX.Element => (
                            <InvitationItem
                                key={invitation.key}
                                invitation={invitation}
                                onAccept={onAccept}
                                onDecline={onDecline}
                            />
                        ),
                    )}
                </Col>
            </Row>
            <Row justify='center' align='middle' className='cvat-resource-pagination-wrapper'>
                <Col {...dimensions}>
                    <Pagination
                        className='cvat-invitations-pagination'
                        onChange={onPageChange}
                        total={totalCount}
                        pageSize={query.pageSize}
                        current={query.page}
                        showQuickJumper
                        showSizeChanger
                    />
                </Col>
            </Row>
        </>
    );
}
