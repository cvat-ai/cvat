// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) 2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { useSelector } from 'react-redux';
import Select from 'antd/lib/select';
import Text from 'antd/lib/typography/Text';
import Dropdown from 'antd/lib/dropdown';
import { Row, Col } from 'antd/lib/grid';
import moment from 'moment';
import { DeleteOutlined, MoreOutlined } from '@ant-design/icons';
import Modal from 'antd/lib/modal';
import { CombinedState } from 'reducers';
import Menu, { MenuInfo } from 'components/dropdown-menu';

import { Membership } from 'cvat-core-wrapper';

export interface Props {
    membershipInstance: Membership;
    onRemoveMembership(): void;
    onUpdateMembershipRole(role: string): void;
    onResendInvitation(key: string): void;
    onDeleteInvitation(key: string): void;
}

enum MenuKeys {
    RESEND_INVITATION = 'resend_invitation',
    DELETE_INVITATION = 'delete_invitation',
}

function MemberItem(props: Props): JSX.Element {
    const {
        membershipInstance, onRemoveMembership, onUpdateMembershipRole,
        onResendInvitation, onDeleteInvitation,
    } = props;
    const {
        user, joinedDate, role, invitation, isActive,
    } = membershipInstance;
    const { username, firstName, lastName } = user;
    const { username: selfUserName } = useSelector((state: CombinedState) => state.auth.user);

    const invitationActionsMenu = invitation && (
        <Dropdown
            destroyPopupOnHide
            trigger={['click']}
            overlay={(
                <Menu onClick={(action: MenuInfo) => {
                    if (action.key === MenuKeys.RESEND_INVITATION) {
                        onResendInvitation(invitation.key);
                    } else if (action.key === MenuKeys.DELETE_INVITATION) {
                        onDeleteInvitation(invitation.key);
                    }
                }}
                >
                    <Menu.Item key={MenuKeys.RESEND_INVITATION}>Resend invitation</Menu.Item>
                    <Menu.Divider />
                    <Menu.Item key={MenuKeys.DELETE_INVITATION}>Remove invitation</Menu.Item>
                </Menu>
            )}
        >
            <MoreOutlined className='cvat-organization-invitation-actions-button cvat-menu-icon' />
        </Dropdown>
    );

    const removeMemberBlock = (role === 'owner' || selfUserName === username) ? null : (
        <DeleteOutlined
            onClick={() => {
                Modal.confirm({
                    className: 'cvat-modal-organization-member-remove',
                    title: `You are removing "${username}" from this organization`,
                    content: 'The person will not have access to the organization data anymore. Continue?',
                    okText: 'Yes, remove',
                    okButtonProps: {
                        danger: true,
                    },
                    onOk: () => {
                        onRemoveMembership();
                    },
                });
            }}
        />
    );

    const leftBlock = isActive ? removeMemberBlock : invitationActionsMenu;

    return (
        <Row className='cvat-organization-member-item' justify='space-between'>
            <Col span={5} className='cvat-organization-member-item-username'>
                <Text strong>{username}</Text>
            </Col>
            <Col span={6} className='cvat-organization-member-item-name'>
                <Text strong>{`${firstName || ''} ${lastName || ''}`}</Text>
            </Col>
            <Col span={8} className='cvat-organization-member-item-dates'>
                {invitation ? (
                    <Text type='secondary'>
                        {`Invited ${moment(invitation.createdDate).fromNow()} ${invitation.owner ? `by ${invitation.owner.username}` : ''}`}
                    </Text>
                ) : null}
                {joinedDate ? <Text type='secondary'>{`Joined ${moment(joinedDate).fromNow()}`}</Text> : <Text type='secondary'>Invitation pending</Text>}
            </Col>
            <Col span={3} className='cvat-organization-member-item-role'>
                <Select
                    onChange={(_role: string) => {
                        onUpdateMembershipRole(_role);
                    }}
                    value={role}
                    disabled={role === 'owner'}
                >
                    {role === 'owner' ? (
                        <Select.Option value='owner'>Owner</Select.Option>
                    ) : (
                        <>
                            <Select.Option value='worker'>Worker</Select.Option>
                            <Select.Option value='supervisor'>Supervisor</Select.Option>
                            <Select.Option value='maintainer'>Maintainer</Select.Option>
                        </>
                    )}
                </Select>
            </Col>
            <Col span={1} className='cvat-organization-member-item-remove'>
                {leftBlock}
            </Col>
        </Row>
    );
}

export default React.memo(MemberItem);
