// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { useSelector } from 'react-redux';
import Text from 'antd/lib/typography/Text';
import { Row, Col } from 'antd/lib/grid';
import moment from 'moment';
import { CombinedState } from 'reducers';
import { Membership } from 'cvat-core-wrapper';
import { MoreOutlined } from '@ant-design/icons';
import MemberActionsMenu from './actions-menu';
import MemberRoleSelector from './member-role-selector';

export interface Props {
    membershipInstance: Membership;
    onRemoveMembership(): void;
    onUpdateMembershipRole(role: string): void;
    onResendInvitation(key: string): void;
    onDeleteInvitation(key: string): void;
    selected?: boolean;
    onClick?: (event: React.MouseEvent) => boolean;
}

function MemberItem(props: Readonly<Props>): JSX.Element {
    const {
        membershipInstance, onRemoveMembership, onUpdateMembershipRole,
        onResendInvitation, onDeleteInvitation, selected, onClick,
    } = props;
    const {
        user, joinedDate, role, invitation,
    } = membershipInstance;
    const { username, firstName, lastName } = user;
    const { username: selfUserName } = useSelector((state: CombinedState) => state.auth.user || { username: '' });
    const rowClassName = `cvat-organization-member-item${selected ? ' cvat-item-selected' : ''}`;

    return (
        <MemberActionsMenu
            membershipInstance={membershipInstance}
            onRemoveMembership={onRemoveMembership}
            onResendInvitation={onResendInvitation}
            onDeleteInvitation={onDeleteInvitation}
            onUpdateMembershipRole={onUpdateMembershipRole}
            selfUserName={selfUserName}
            dropdownTrigger={['contextMenu']}
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
                            onRemoveMembership={onRemoveMembership}
                            onResendInvitation={onResendInvitation}
                            onDeleteInvitation={onDeleteInvitation}
                            onUpdateMembershipRole={onUpdateMembershipRole}
                            selfUserName={selfUserName}
                            triggerElement={
                                <MoreOutlined className='cvat-organization-invitation-actions-button cvat-menu-icon' />
                            }
                        />
                    </Col>
                </Row>
            )}
        />
    );
}

export default React.memo(MemberItem);
