// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { shallowEqual, useDispatch, useSelector } from 'react-redux';
import dayjs from 'dayjs';
import Text from 'antd/lib/typography/Text';
import { Row, Col } from 'antd/lib/grid';
import { CombinedState } from 'reducers';
import { Membership } from 'cvat-core-wrapper';
import { MoreOutlined } from '@ant-design/icons';
import { makeBulkOperationAsync } from 'actions/bulk-actions';
import { updateOrganizationMemberAsync } from 'actions/organization-actions';
import { useContextMenuClick } from 'utils/hooks';
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
    const {
        memberships,
        organizationInstance,
        selectedIds,
        selfUserName,
    } = useSelector((state: CombinedState) => ({
        memberships: state.organizations.members,
        organizationInstance: state.organizations.current,
        selectedIds: state.organizations.selectedMembers,
        selfUserName: state.auth.user?.username ?? '',
    }), shallowEqual);

    const { itemRef, handleContextMenuClick } = useContextMenuClick<HTMLDivElement>();

    const rowClassName = `cvat-organization-member-item${selected ? ' cvat-item-selected' : ''}`;
    const canUpdateRole = (membership: Membership): boolean => (membership.role !== 'owner');
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

    /* eslint-disable jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */
    return (
        <MemberActionsMenu
            membershipInstance={membershipInstance}
            selfUserName={selfUserName}
            dropdownTrigger={['contextMenu']}
            fetchMembers={fetchMembers}
            onUpdateMembershipRole={onUpdateMembershipRole}
            triggerElement={(
                <Row
                    ref={itemRef}
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
                                {`Invited ${dayjs(invitation.createdDate).fromNow()}`}
                                {invitation.owner && ` by ${invitation.owner.username}`}
                            </Text>
                        ) : null}
                        {joinedDate ? <Text type='secondary'>{`Joined ${dayjs(joinedDate).fromNow()}`}</Text> : <Text type='secondary'>Invitation pending</Text>}
                    </Col>
                    <Col span={3} className='cvat-organization-member-item-role'>
                        <MemberRoleSelector
                            value={role}
                            onChange={onUpdateMembershipRole}
                            disabled={role === 'owner'}
                        />
                    </Col>
                    <Col span={1}>
                        <div
                            onClick={handleContextMenuClick}
                            className='cvat-organization-actions-button cvat-actions-menu-button cvat-menu-icon'
                        >
                            <MoreOutlined className='cvat-menu-icon' />
                        </div>
                    </Col>
                </Row>
            )}
        />
    );
}

export default React.memo(MemberItem);
