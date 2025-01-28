// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
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

const PAGE_SIZE = 11;

export default function InvitationsListComponent(props: Props): JSX.Element {
    const { query } = props;

    const dispatch = useDispatch();
    const invitations = useSelector((state: CombinedState) => state.invitations.current);
    const totalCount = useSelector((state: CombinedState) => state.invitations.count);

    const onAccept = useCallback((invitationKey) => (
        dispatch(acceptInvitationAsync(invitationKey, (orgSlug: string) => {
            localStorage.setItem('currentOrganization', orgSlug);
            window.location.reload();
        }))), []);

    const onDecline = useCallback((invitationKey) => (
        dispatch(declineInvitationAsync(invitationKey))
    ), []);

    const onPageChange = useCallback((newPage) => {
        dispatch(getInvitationsAsync({
            ...query,
            page: newPage,
        }));
    }, []);

    return (
        <>
            <Row justify='center' align='top' className='cvat-invitations-list-content'>
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
            <Row justify='center' align='middle'>
                <Col {...dimensions}>
                    <Pagination
                        className='cvat-invitations-pagination'
                        showSizeChanger={false}
                        total={totalCount}
                        pageSize={PAGE_SIZE}
                        current={query.page}
                        onChange={onPageChange}
                        showQuickJumper
                    />
                </Col>
            </Row>
        </>
    );
}
