// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import Pagination from 'antd/lib/pagination';
import Spin from 'antd/lib/spin';

import { useDispatch, useSelector } from 'react-redux';
import { CombinedState } from 'reducers';
import {
    removeOrganizationMemberAsync, updateOrganizationMemberAsync,
} from 'actions/organization-actions';
import { resendInvitationAsync } from 'actions/invitations-actions';
import { Membership } from 'cvat-core-wrapper';
import MemberItem from './member-item';

export interface Props {
    organizationInstance: any;
    userInstance: any;
    fetching: boolean;
    pageSize: number;
    pageNumber: number;
    members: Membership[];
    setPageNumber: (pageNumber: number) => void;
    setPageSize: (pageSize: number) => void;
    fetchMembers: () => void;
}

function MembersList(props: Props): JSX.Element {
    const {
        organizationInstance, fetching, members, pageSize, pageNumber, fetchMembers, setPageNumber, setPageSize,
    } = props;
    const dispatch = useDispatch();
    const inviting = useSelector((state: CombinedState) => state.organizations.inviting);
    const updatingMember = useSelector((state: CombinedState) => state.organizations.updatingMember);
    const removingMember = useSelector((state: CombinedState) => state.organizations.removingMember);

    return fetching || inviting || updatingMember || removingMember ? (
        <Spin className='cvat-spinner' />
    ) : (
        <>
            <div>
                {members.map(
                    (member: Membership): JSX.Element => (
                        <MemberItem
                            key={member.user.id}
                            membershipInstance={member}
                            onRemoveMembership={() => {
                                dispatch(
                                    removeOrganizationMemberAsync(organizationInstance, member, () => {
                                        fetchMembers();
                                    }),
                                );
                            }}
                            onUpdateMembershipRole={(role: string) => {
                                dispatch(
                                    updateOrganizationMemberAsync(organizationInstance, member, role, () => {
                                        fetchMembers();
                                    }),
                                );
                            }}
                            onResendInvitation={(key: string) => {
                                dispatch(
                                    resendInvitationAsync(organizationInstance, key),
                                );
                            }}
                            onDeleteInvitation={() => {
                                dispatch(
                                    removeOrganizationMemberAsync(organizationInstance, member, () => {
                                        fetchMembers();
                                    }),
                                );
                            }}
                        />
                    ),
                )}
            </div>
            <div className='cvat-organization-members-pagination-block'>
                <Pagination
                    total={members.length ? (members as any).count : 0}
                    onShowSizeChange={(current: number, newShowSize: number) => {
                        setPageNumber(current);
                        setPageSize(newShowSize);
                    }}
                    onChange={(current: number) => {
                        setPageNumber(current);
                    }}
                    current={pageNumber}
                    pageSize={pageSize}
                    showSizeChanger
                    showQuickJumper
                />
            </div>
        </>
    );
}

export default React.memo(MembersList);
