// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
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
import BulkWrapper from 'components/tasks-page/bulk-wrapper';
import { makeBulkOperationAsync } from 'actions/selection-actions';
import MemberItem from './member-item';
import EmptyListComponent from './empty-list';

export interface Props {
    organizationInstance: any;
    userInstance: any;
    fetching: boolean;
    pageSize: number;
    pageNumber: number;
    members: Membership[];
    onPageChange: (page: number, pageSize: number) => void;
    fetchMembers: () => void;
}

function MembersList(props: Readonly<Props>): JSX.Element {
    const {
        organizationInstance, fetching, members, pageSize, pageNumber, fetchMembers, onPageChange,
    } = props;
    const dispatch = useDispatch();
    const inviting = useSelector((state: CombinedState) => state.organizations.inviting);
    const updatingMember = useSelector((state: CombinedState) => state.organizations.updatingMember);
    const removingMember = useSelector((state: CombinedState) => state.organizations.removingMember);
    const selectedIds = useSelector((state: CombinedState) => state.selection.selected);

    if (fetching || inviting || updatingMember || removingMember) {
        return <Spin className='cvat-spinner' />;
    }

    const handleRemoveMembership = (member: Membership): void => {
        const allSelected = selectedIds.includes(member.id) ?
            members.filter((m) => selectedIds.includes(m.id)) : [member];
        dispatch(makeBulkOperationAsync(
            allSelected,
            async (m) => {
                await dispatch(removeOrganizationMemberAsync(organizationInstance, m, fetchMembers));
            },
            (m, idx, total) => `Removing member ${m.user.username} (${idx + 1}/${total})`,
        ));
    };
    const handleUpdateMembershipRole = (member: Membership, role: string): void => {
        const allSelected = selectedIds.includes(member.id) ?
            members.filter((m) => selectedIds.includes(m.id)) : [member];
        dispatch(makeBulkOperationAsync(
            allSelected,
            async (m) => {
                await dispatch(updateOrganizationMemberAsync(organizationInstance, m, role, fetchMembers));
            },
            (m, idx, total) => `Updating role for ${m.user.username} (${idx + 1}/${total})`,
        ));
    };
    const handleResendInvitation = (key: string): void => {
        const allSelected = members.filter((m) => selectedIds.includes(m.id));
        dispatch(makeBulkOperationAsync(
            allSelected.length ? allSelected : members.filter((m) => m.invitation.key === key),
            async (m) => {
                await dispatch(resendInvitationAsync(organizationInstance, m.invitation.key));
            },
            (m, idx, total) => `Resending invitation to ${m.user.username} (${idx + 1}/${total})`,
        ));
    };
    const handleDeleteInvitation = (member: Membership): void => {
        const allSelected = selectedIds.includes(member.id) ?
            members.filter((m) => selectedIds.includes(m.id)) : [member];
        dispatch(makeBulkOperationAsync(
            allSelected,
            async (m) => {
                await dispatch(removeOrganizationMemberAsync(organizationInstance, m, fetchMembers));
            },
            (m, idx, total) => `Removing invitation for ${m.user.username} (${idx + 1}/${total})`,
        ));
    };

    const content = members.length ? (
        <>
            <div className='cvat-organization-members-list'>
                <BulkWrapper currentResourceIDs={members.map((member) => member.id)}>
                    {(selectProps) => (
                        <>
                            {members.map((member, idx) => (
                                <MemberItem
                                    key={member.id}
                                    membershipInstance={member}
                                    {...selectProps(member.id, idx)}
                                    onRemoveMembership={() => handleRemoveMembership(member)}
                                    onUpdateMembershipRole={(role: string) => handleUpdateMembershipRole(member, role)}
                                    onResendInvitation={handleResendInvitation}
                                    onDeleteInvitation={() => handleDeleteInvitation(member)}
                                />
                            ))}
                        </>
                    )}
                </BulkWrapper>
            </div>
            <div className='cvat-organization-members-pagination-block'>
                <Pagination
                    total={members.length ? (members as any).count : 0}
                    onChange={(current: number, newPageSize: number) => {
                        onPageChange(current, newPageSize);
                    }}
                    current={pageNumber}
                    pageSize={pageSize}
                    showSizeChanger
                    showQuickJumper
                />
            </div>
        </>
    ) : (
        <EmptyListComponent />
    );

    return content;
}

export default React.memo(MembersList);
