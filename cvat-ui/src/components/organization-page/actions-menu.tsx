// Copyright (C) 2021-2025 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import Dropdown from 'antd/lib/dropdown';
import Modal from 'antd/lib/modal';
import { MenuInfo } from 'components/dropdown-menu';
import { Membership } from 'cvat-core-wrapper';
import { useDropdownEditField } from 'utils/hooks';
import { CVATMenuEditLabel } from 'components/common/cvat-menu-edit-label';
import { MenuProps } from 'antd/lib/menu';
import { useSelector } from 'react-redux';
import { CombinedState } from 'reducers';
import { LabelWithCountHOC } from 'components/common/label-with-count';
import MemberRoleSelector from './member-role-selector';

export interface MemberActionsMenuProps {
    membershipInstance: Membership;
    onRemoveMembership(): void;
    onResendInvitation(key: string): void;
    onDeleteInvitation(key: string): void;
    onUpdateMembershipRole: (role: string) => void;
    selfUserName: string;
    triggerElement: JSX.Element;
    dropdownTrigger?: ('click' | 'hover' | 'contextMenu')[];
}

enum MenuKeys {
    EDIT_ROLE = 'edit_role',
    RESEND_INVITATION = 'resend_invitation',
    DELETE_INVITATION = 'delete_invitation',
    REMOVE_MEMBER = 'remove_member',
}

function MemberActionsMenu(props: Readonly<MemberActionsMenuProps>): JSX.Element | null {
    const {
        membershipInstance, onRemoveMembership, onResendInvitation,
        onDeleteInvitation, selfUserName, onUpdateMembershipRole,
        triggerElement, dropdownTrigger,
    } = props;
    const {
        user, role, invitation,
    } = membershipInstance;
    const { username } = user;

    const {
        dropdownOpen,
        editField,
        startEditField,
        stopEditField,
        onOpenChange,
    } = useDropdownEditField();

    const selectedIds = useSelector((state: CombinedState) => state.selection.selected);

    const isBulkMode = selectedIds.length > 1;
    const bulkKeys = [MenuKeys.EDIT_ROLE, MenuKeys.REMOVE_MEMBER, MenuKeys.DELETE_INVITATION].map(String);
    const withCount = LabelWithCountHOC(isBulkMode, selectedIds, bulkKeys);

    let menuItems: NonNullable<MenuProps['items']> = [
        {
            key: MenuKeys.EDIT_ROLE,
            label: (
                <CVATMenuEditLabel>{withCount('Role', MenuKeys.EDIT_ROLE, undefined, CVATMenuEditLabel)}</CVATMenuEditLabel>
            ),
            disabled: role === 'owner',
        },
    ];
    if (editField === 'role') {
        menuItems = [{
            key: 'role-selector',
            label: (
                <MemberRoleSelector
                    value={role}
                    onChange={(newRole) => {
                        if (role !== newRole) {
                            onUpdateMembershipRole(newRole);
                        }
                        stopEditField();
                    }}
                    disabled={role === 'owner'}
                />
            ),
        }];
    } else if (invitation && !membershipInstance.isActive) {
        menuItems.push(
            { key: MenuKeys.RESEND_INVITATION, label: withCount('Resend invitation', MenuKeys.RESEND_INVITATION) },
            { key: 'divider', type: 'divider' },
            { key: MenuKeys.DELETE_INVITATION, label: withCount('Remove invitation', MenuKeys.DELETE_INVITATION) },
        );
    } else if (role !== 'owner' && selfUserName !== username) {
        menuItems.push({ key: MenuKeys.REMOVE_MEMBER, label: withCount('Delete', MenuKeys.REMOVE_MEMBER) });
    }

    return (
        <Dropdown
            destroyPopupOnHide
            trigger={dropdownTrigger || ['click']}
            open={dropdownOpen}
            onOpenChange={onOpenChange}
            menu={{
                className: 'cvat-organization-membership-actions-menu',
                items: menuItems,
                onClick: (action: MenuInfo) => {
                    if (action.key === MenuKeys.RESEND_INVITATION) {
                        onResendInvitation(invitation.key);
                    } else if (action.key === MenuKeys.DELETE_INVITATION) {
                        onDeleteInvitation(invitation.key);
                    } else if (action.key === 'remove_member') {
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
                    } else if (action.key === 'edit_role') {
                        startEditField('role');
                    }
                },
            }}
        >
            {triggerElement}
        </Dropdown>
    );
}

export default React.memo(MemberActionsMenu);
