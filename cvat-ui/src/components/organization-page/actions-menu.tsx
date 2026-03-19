// Copyright (C) 2021-2025 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import Dropdown from 'antd/lib/dropdown';
import Modal from 'antd/lib/modal';
import { ItemType } from 'antd/lib/menu/hooks/useItems';
import { MenuInfo } from 'components/dropdown-menu';
import { Membership } from 'cvat-core-wrapper';
import { useDropdownEditField } from 'utils/hooks';
import { CVATMenuEditLabel } from 'components/common/cvat-menu-edit-label';
import { MenuProps } from 'antd/lib/menu';
import { useDispatch, useSelector, shallowEqual } from 'react-redux';
import { CombinedState } from 'reducers';
import { LabelWithCountHOF } from 'components/common/label-with-count';
import { makeBulkOperationAsync } from 'actions/bulk-actions';
import { removeOrganizationMemberAsync } from 'actions/organization-actions';
import { resendInvitationAsync } from 'actions/invitations-actions';
import MemberRoleSelector from './member-role-selector';

export interface MemberActionsMenuProps {
    membershipInstance: Membership;
    onUpdateMembershipRole: (role: string) => void;
    fetchMembers: () => void;
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
        membershipInstance, selfUserName, onUpdateMembershipRole,
        triggerElement, dropdownTrigger, fetchMembers,
    } = props;
    const {
        user, role,
    } = membershipInstance;
    const { username } = user;

    const {
        dropdownOpen,
        editField,
        startEditField,
        stopEditField,
        onOpenChange,
    } = useDropdownEditField();

    const dispatch = useDispatch();
    const {
        selectedIds,
        members,
        organizationInstance,
    } = useSelector((state: CombinedState) => ({
        selectedIds: state.organizations.selectedMembers,
        members: state.organizations.members,
        organizationInstance: state.organizations.current!,
    }), shallowEqual);

    const isBulkMode = selectedIds.length > 1;
    let membershipsToAct: Membership[] = [membershipInstance];
    if (selectedIds.includes(membershipInstance.id)) {
        membershipsToAct = members.filter((m) => selectedIds.includes(m.id));
    }

    const bulkKeys = [
        MenuKeys.EDIT_ROLE, MenuKeys.RESEND_INVITATION,
        MenuKeys.REMOVE_MEMBER, MenuKeys.DELETE_INVITATION,
    ];
    const canUpdateRole = (membership: Membership): boolean => (membership.role !== 'owner');
    const canOperateInvitation = (membership: Membership): boolean => (
        Boolean(membership.invitation && !membership.isActive && membership.invitation.key)
    );
    const canRemoveMembership = (membership: Membership): boolean => (
        membership.role !== 'owner' && selfUserName !== membership.user.username && !canOperateInvitation(membership)
    );
    const actionsApplicable = {
        [MenuKeys.EDIT_ROLE]: membershipsToAct.filter(canUpdateRole),
        [MenuKeys.RESEND_INVITATION]: membershipsToAct.filter(canOperateInvitation),
        [MenuKeys.DELETE_INVITATION]: membershipsToAct.filter(canOperateInvitation),
        [MenuKeys.REMOVE_MEMBER]: membershipsToAct.filter(canRemoveMembership),
    };

    const withCount = LabelWithCountHOF(selectedIds, bulkKeys, actionsApplicable);

    const handleRemoveMembership = (
        actionType: MenuKeys.REMOVE_MEMBER | MenuKeys.DELETE_INVITATION,
    ): void => {
        const membershipsToRemove = actionsApplicable[actionType];
        const actionLabel = actionType === MenuKeys.DELETE_INVITATION ? 'Deleting invitation for' : 'Removing member';

        dispatch(makeBulkOperationAsync(
            membershipsToRemove,
            async (m) => {
                await dispatch(removeOrganizationMemberAsync(organizationInstance, m));
            },
            (m, idx, total) => `${actionLabel} ${m.user.username} (${idx + 1}/${total})`,
            fetchMembers,
        ));
    };
    const handleResendInvitation = (): void => {
        const membershipsToResend = actionsApplicable[MenuKeys.RESEND_INVITATION];
        dispatch(makeBulkOperationAsync(
            membershipsToResend,
            async (m) => {
                await dispatch(resendInvitationAsync(organizationInstance, m.invitation.key));
            },
            (m, idx, total) => `Resending invitation to ${m.user.username} (${idx + 1}/${total})`,
            fetchMembers,
        ));
    };

    let menuItems: NonNullable<MenuProps['items']> = [
        {
            key: MenuKeys.EDIT_ROLE,
            label: (
                <CVATMenuEditLabel>{withCount('Role', MenuKeys.EDIT_ROLE)}</CVATMenuEditLabel>
            ),
            disabled: role === 'owner' && actionsApplicable[MenuKeys.EDIT_ROLE].length < 1,
        },
    ];
    if (editField === 'role') {
        menuItems = [{
            key: 'role-selector',
            label: (
                <MemberRoleSelector
                    value={isBulkMode ? null : role}
                    onChange={(newRole) => {
                        stopEditField();
                        onUpdateMembershipRole(newRole);
                    }}
                    disabled={role === 'owner' && actionsApplicable[MenuKeys.EDIT_ROLE].length < 1}
                />
            ),
        }];
    } else {
        menuItems.push(
            ...(actionsApplicable[MenuKeys.RESEND_INVITATION].length > 0 ?
                [{ key: MenuKeys.RESEND_INVITATION, label: withCount('Resend invitation', MenuKeys.RESEND_INVITATION) }] :
                []),
            ...(actionsApplicable[MenuKeys.DELETE_INVITATION].length > 0 ?
                [{ key: 'divider', type: 'divider' } as ItemType] :
                []),
            ...(actionsApplicable[MenuKeys.DELETE_INVITATION].length > 0 ?
                [{ key: MenuKeys.DELETE_INVITATION, label: withCount('Remove invitation', MenuKeys.DELETE_INVITATION) }] :
                []),
            ...(actionsApplicable[MenuKeys.REMOVE_MEMBER].length > 0 ?
                [{ key: MenuKeys.REMOVE_MEMBER, label: withCount('Delete', MenuKeys.REMOVE_MEMBER) }] :
                []),
        );
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
                        handleResendInvitation();
                    } else if (action.key === MenuKeys.DELETE_INVITATION) {
                        handleRemoveMembership(MenuKeys.DELETE_INVITATION);
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
                                handleRemoveMembership(MenuKeys.REMOVE_MEMBER);
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
