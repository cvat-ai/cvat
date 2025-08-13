// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Text from 'antd/lib/typography/Text';
import { Row, Col } from 'antd/lib/grid';
import moment from 'moment';
import { CombinedState } from 'reducers';
import { Membership } from 'cvat-core-wrapper';
import { MoreOutlined } from '@ant-design/icons';
import { makeBulkOperationAsync } from 'actions/bulk-actions';
import { updateOrganizationMemberAsync } from 'actions/organization-actions';
import MemberActionsMenu from './actions-menu';
import MemberRoleSelector from './member-role-selector';

export interface Props {
    membershipInstance: Membership;
    fetchMembers: () => void;
    selected?: boolean;
    onClick?: (event: React.MouseEvent) => boolean;
}

function MemberItem(props: Readonly<Props>): JSX.Element {
    const {
        membershipInstance, selected, onClick, fetchMembers,
    } = props;
    const {
        user, joinedDate, role, invitation,
    } = membershipInstance;
    const { username, firstName, lastName } = user;

    const dispatch = useDispatch();
    const memberships = useSelector((state: CombinedState) => state.organizations.members);
    const organizationInstance = useSelector((state: CombinedState) => state.organizations.current);
    const selectedIds = useSelector((state: CombinedState) => state.organizations.selectedMembers);
    const { username: selfUserName } = useSelector((state: CombinedState) => state.auth.user || { username: '' });
    const rowClassName = `cvat-organization-member-item${selected ? ' cvat-item-selected' : ''}`;

    const canUpdateRole = (membership: Membership) => (membership.role !== 'owner');
    const onUpdateMembershipRole = (newRole: string): void => {
        const membershipToUpdate = selectedIds.includes(membershipInstance.id) ?
            memberships
                .filter((m) => selectedIds.includes(m.id))
                .filter(canUpdateRole) :
            [membershipInstance];

        const membershipsNeedingUpdate = membershipToUpdate.filter((m) => m.role !== newRole);

        if (membershipsNeedingUpdate.length === 0) {
            return;
        }

        dispatch(makeBulkOperationAsync(
            membershipsNeedingUpdate,
            async (m) => {
                await dispatch(updateOrganizationMemberAsync(organizationInstance, m, newRole));
            },
            (m, idx, total) => `Updating role for ${m.user.username} (${idx + 1}/${total})`,
            fetchMembers,
        ));
    };

    return (
        <MemberActionsMenu
            membershipInstance={membershipInstance}
            selfUserName={selfUserName}
            dropdownTrigger={['contextMenu']}
            fetchMembers={fetchMembers}
            onUpdateMembershipRole={onUpdateMembershipRole}
            triggerElement={(
                <Row
                    className={rowClassName}
                    justify='space-between'
                    onClick={onClick}
                >
                    <Col span={5} className='cvat-organization-member-item-username'>
                        <Text strong>{username}</Text>
                    </Col>
                    <Col span={6} className='cvat-organization-member-item-name'>
                        <Text strong>{`${firstName || ''} ${lastName || ''}`}</Text>
                    </Col>
                    <Col span={8} className='cvat-organization-member-item-dates'>
                        {invitation ? (
                            <Text type='secondary'>
                                {`Invited ${moment(invitation.createdDate).fromNow()}`}
                                {invitation.owner && ` by ${invitation.owner.username}`}
                            </Text>
                        ) : null}
                        {joinedDate ? <Text type='secondary'>{`Joined ${moment(joinedDate).fromNow()}`}</Text> : <Text type='secondary'>Invitation pending</Text>}
                    </Col>
                    <Col span={3} className='cvat-organization-member-item-role'>
                        <MemberRoleSelector
                            value={role}
                            onChange={onUpdateMembershipRole}
                            disabled={role === 'owner'}
                        />
                    </Col>
                    <Col span={1} className='cvat-organization-member-item-remove'>
                        <MemberActionsMenu
                            membershipInstance={membershipInstance}
                            onUpdateMembershipRole={onUpdateMembershipRole}
                            selfUserName={selfUserName}
                            fetchMembers={fetchMembers}
                            triggerElement={
                                <MoreOutlined className='cvat-organization-actions-button cvat-actions-menu-button cvat-menu-icon' />
                            }
                        />
                    </Col>
                </Row>
            )}
        />
    );
}

export default React.memo(MemberItem);
