// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useCallback, useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Row, Col } from 'antd/lib/grid';
import Pagination from 'antd/lib/pagination';

import { CombinedState, InvitationsQuery } from 'reducers';
import { Invitation } from 'cvat-core/src/organization';
import { acceptInvitationAsync, rejectInvitationAsync } from 'actions/invitations-actions';
import { updateHistoryFromQuery } from 'components/resource-sorting-filtering';
import { useHistory } from 'react-router';
import notification from 'antd/lib/notification';
import InvitationItem from './invitation-item';

import dimensions from '../projects-page/dimensions';

interface Props {
    query: InvitationsQuery;
}

const PAGE_SIZE = 9;

function setUpInvitationsList(invitations: Invitation[], newPage: number): Invitation[] {
    return invitations.slice((newPage - 1) * PAGE_SIZE, newPage * PAGE_SIZE);
}

export default function InvitationsListComponent(props: Props): JSX.Element {
    const { query } = props;

    const dispatch = useDispatch();
    const history = useHistory();
    const invitations = useSelector((state: CombinedState) => state.invitations.invitations);
    const [page, setPage] = useState(query.page);
    const renderedInvitations = setUpInvitationsList(invitations, page);

    const onAccept = useCallback((invintationKey) => {
        dispatch(acceptInvitationAsync(invintationKey, (orgSlug: string) => {
            localStorage.setItem('currentOrganization', orgSlug);
            window.location.reload();
        }));
    }, []);

    const onReject = useCallback((invintationKey) => {
        dispatch(rejectInvitationAsync(invintationKey));
    }, []);

    const onPageChange = useCallback((newPage) => {
        history.replace({
            search: updateHistoryFromQuery({ page: newPage }),
        });
        setPage(newPage);
    }, []);

    const totalCount = invitations.length;
    const pageOutOfBounds = totalCount && query.page > Math.ceil(totalCount / PAGE_SIZE);
    useEffect(() => {
        if (pageOutOfBounds) {
            notification.error({
                message: 'Could not fetch invitations',
                description: 'Invalid page',
            });
        }
    }, [invitations, query]);

    return (
        <>
            <Row justify='center' align='top' className='cvat-invitations-list-content'>
                <Col className='cvat-invitations-list' {...dimensions}>
                    {renderedInvitations.map(
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
                        total={totalCount}
                        pageSize={PAGE_SIZE}
                        current={page}
                        onChange={onPageChange}
                        showQuickJumper
                    />
                </Col>
            </Row>
        </>
    );
}
