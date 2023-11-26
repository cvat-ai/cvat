// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useCallback, useEffect } from 'react';
import { useHistory } from 'react-router';
import { useSelector, useDispatch } from 'react-redux';
import { Row, Col } from 'antd/lib/grid';
import Pagination from 'antd/lib/pagination';

import { CombinedState, InvitationsQuery } from 'reducers';
import { Invitation } from 'cvat-core/src/organization';
import InvitationItem from './invitation-item';

import dimensions from '../projects-page/dimensions';

interface Props {
    query: InvitationsQuery;
}

export default function InvitationsListComponent(props: Props): JSX.Element {
    const { query } = props;

    const dispatch = useDispatch();
    const invitations = useSelector((state: CombinedState) => state.invitations.invitations);

    return (
        <>
            <Row justify='center' align='middle' className='cvat-invitations-list-content'>
                <Col className='cvat-invitations-list' {...dimensions}>
                    {invitations.map(
                        (invitation: Invitation): JSX.Element => (
                            <InvitationItem
                                key={invitation.key}
                                invitation={invitation}
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
