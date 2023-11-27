// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Row, Col } from 'antd/lib/grid';
import Pagination from 'antd/lib/pagination';

import { CombinedState, InvitationsQuery } from 'reducers';
import { Invitation } from 'cvat-core/src/organization';
import { acceptInvitationAsync, rejectInvitationAsync } from 'actions/invitations-actions';
import InvitationItem from './invitation-item';

import dimensions from '../projects-page/dimensions';

interface Props {
    query: InvitationsQuery;
}

export default function InvitationsListComponent(props: Props): JSX.Element {
    const { query } = props;

    const dispatch = useDispatch();
    const invitations = useSelector((state: CombinedState) => state.invitations.invitations);

    const onAccept = useCallback((invintationKey) => {
        dispatch(acceptInvitationAsync(invintationKey, (orgSlug: string) => {
            localStorage.setItem('currentOrganization', orgSlug);
            window.location.reload();
        }));
    }, []);

    const onReject = useCallback((invintationKey) => {
        dispatch(rejectInvitationAsync(invintationKey));
    }, []);

    return (
        <>
            <Row justify='center' align='middle' className='cvat-invitations-list-content'>
                <Col className='cvat-invitations-list' {...dimensions}>
                    {invitations.map(
                        (invitation: Invitation): JSX.Element => (
                            <InvitationItem
                                key={invitation.key}
                                invitation={invitation}
                                onAccept={onAccept}
                                onReject={onReject}
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
                        total={invitations.length}
                        pageSize={12}
                        current={query.page}
                        showQuickJumper
                    />
                </Col>
            </Row>
        </>
    );
}
