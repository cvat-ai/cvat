// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { Store } from 'antd/lib/form/interface';
import { getCore, User } from 'cvat-core-wrapper';
import { ActionUnion, createAction, ThunkAction } from 'utils/redux';

const core = getCore();

export enum OrganizationActionsTypes {
    ACTIVATE_ORGANIZATION = 'ACTIVATE_ORGANIZATION',
    ACTIVATE_ORGANIZATION_SUCCESS = 'ACTIVATE_ORGANIZATION_SUCCESS',
    ACTIVATE_ORGANIZATION_FAILED = 'ACTIVATE_ORGANIZATION_FAILED',
    CREATE_ORGANIZATION_SUCCESS = 'CREATE_ORGANIZATION_SUCCESS',
    CREATE_ORGANIZATION_FAILED = 'CREATE_ORGANIZATION_FAILED',
    UPDATE_ORGANIZATION = 'UPDATE_ORGANIZATION',
    UPDATE_ORGANIZATION_SUCCESS = 'UPDATE_ORGANIZATION_SUCCESS',
    UPDATE_ORGANIZATION_FAILED = 'UPDATE_ORGANIZATION_FAILED',
    REMOVE_ORGANIZATION = 'REMOVE_ORGANIZATION',
    REMOVE_ORGANIZATION_SUCCESS = 'REMOVE_ORGANIZATION_SUCCESS',
    REMOVE_ORGANIZATION_FAILED = 'REMOVE_ORGANIZATION_FAILED',
    INVITE_ORGANIZATION_MEMBERS = 'INVITE_ORGANIZATION_MEMBERS',
    INVITE_ORGANIZATION_MEMBERS_FAILED = 'INVITE_ORGANIZATION_MEMBERS_FAILED',
    INVITE_ORGANIZATION_MEMBERS_DONE = 'INVITE_ORGANIZATION_MEMBERS_DONE',
    INVITE_ORGANIZATION_MEMBER_SUCCESS = 'INVITE_ORGANIZATION_MEMBER_SUCCESS',
    INVITE_ORGANIZATION_MEMBER_FAILED = 'INVITE_ORGANIZATION_MEMBER_FAILED',
    LEAVE_ORGANIZATION = 'LEAVE_ORGANIZATION',
    LEAVE_ORGANIZATION_SUCCESS = 'LEAVE_ORGANIZATION_SUCCESS',
    LEAVE_ORGANIZATION_FAILED = 'LEAVE_ORGANIZATION_FAILED',
    REMOVE_ORGANIZATION_MEMBER = 'REMOVE_ORGANIZATION_MEMBERS',
    REMOVE_ORGANIZATION_MEMBER_SUCCESS = 'REMOVE_ORGANIZATION_MEMBER_SUCCESS',
    REMOVE_ORGANIZATION_MEMBER_FAILED = 'REMOVE_ORGANIZATION_MEMBER_FAILED',
    UPDATE_ORGANIZATION_MEMBER = 'UPDATE_ORGANIZATION_MEMBER',
    UPDATE_ORGANIZATION_MEMBER_SUCCESS = 'UPDATE_ORGANIZATION_MEMBER_SUCCESS',
    UPDATE_ORGANIZATION_MEMBER_FAILED = 'UPDATE_ORGANIZATION_MEMBER_FAILED',
}

const organizationActions = {
    activateOrganization: () => createAction(OrganizationActionsTypes.ACTIVATE_ORGANIZATION),
    activateOrganizationSuccess: (organization: any | null) => createAction(
        OrganizationActionsTypes.ACTIVATE_ORGANIZATION_SUCCESS, { organization },
    ),
    activateOrganizationFailed: (error: any, slug: string | null) => createAction(
        OrganizationActionsTypes.ACTIVATE_ORGANIZATION_FAILED, { slug, error },
    ),
    createOrganizationSuccess: (organization: any) => createAction(
        OrganizationActionsTypes.CREATE_ORGANIZATION_SUCCESS, { organization },
    ),
    createOrganizationFailed: (slug: string, error: any) => createAction(
        OrganizationActionsTypes.CREATE_ORGANIZATION_FAILED, { slug, error },
    ),
    updateOrganization: () => createAction(OrganizationActionsTypes.UPDATE_ORGANIZATION),
    updateOrganizationSuccess: (organization: any) => createAction(
        OrganizationActionsTypes.UPDATE_ORGANIZATION_SUCCESS, { organization },
    ),
    updateOrganizationFailed: (slug: string, error: any) => createAction(
        OrganizationActionsTypes.UPDATE_ORGANIZATION_FAILED, { slug, error },
    ),
    removeOrganization: () => createAction(OrganizationActionsTypes.REMOVE_ORGANIZATION),
    removeOrganizationSuccess: (slug: string) => createAction(
        OrganizationActionsTypes.REMOVE_ORGANIZATION_SUCCESS, { slug },
    ),
    removeOrganizationFailed: (error: any, slug: string) => createAction(
        OrganizationActionsTypes.REMOVE_ORGANIZATION_FAILED, { error, slug },
    ),
    inviteOrganizationMembers: () => createAction(OrganizationActionsTypes.INVITE_ORGANIZATION_MEMBERS),
    inviteOrganizationMembersFailed: (error: any) => createAction(
        OrganizationActionsTypes.INVITE_ORGANIZATION_MEMBERS_FAILED, { error },
    ),
    inviteOrganizationMembersDone: () => createAction(OrganizationActionsTypes.INVITE_ORGANIZATION_MEMBERS_DONE),
    inviteOrganizationMemberSuccess: (email: string) => createAction(
        OrganizationActionsTypes.INVITE_ORGANIZATION_MEMBER_SUCCESS, { email },
    ),
    inviteOrganizationMemberFailed: (email: string, error: any) => createAction(
        OrganizationActionsTypes.INVITE_ORGANIZATION_MEMBER_FAILED, { email, error },
    ),
    leaveOrganization: () => createAction(OrganizationActionsTypes.LEAVE_ORGANIZATION),
    leaveOrganizationSuccess: () => createAction(OrganizationActionsTypes.LEAVE_ORGANIZATION_SUCCESS),
    leaveOrganizationFailed: (error: any) => createAction(
        OrganizationActionsTypes.LEAVE_ORGANIZATION_FAILED, { error },
    ),
    removeOrganizationMember: () => createAction(OrganizationActionsTypes.REMOVE_ORGANIZATION_MEMBER),
    removeOrganizationMemberSuccess: () => createAction(OrganizationActionsTypes.REMOVE_ORGANIZATION_MEMBER_SUCCESS),
    removeOrganizationMemberFailed: (username: string, error: any) => createAction(
        OrganizationActionsTypes.REMOVE_ORGANIZATION_MEMBER_FAILED, { username, error },
    ),
    updateOrganizationMember: () => createAction(OrganizationActionsTypes.UPDATE_ORGANIZATION_MEMBER),
    updateOrganizationMemberSuccess: () => createAction(OrganizationActionsTypes.UPDATE_ORGANIZATION_MEMBER_SUCCESS),
    updateOrganizationMemberFailed: (username: string, role: string, error: any) => createAction(
        OrganizationActionsTypes.UPDATE_ORGANIZATION_MEMBER_FAILED, { username, role, error },
    ),
};

export function activateOrganizationAsync(): ThunkAction {
    return async function (dispatch) {
        dispatch(organizationActions.activateOrganization());
        const curSlug = localStorage.getItem('currentOrganization');

        if (curSlug) {
            try {
                const organizations = await core.organizations.get(curSlug ? {
                    filter: `{"and":[{"==":[{"var":"slug"},"${curSlug}"]}]}`,
                } : {});
                const [organization] = organizations;
                if (organization?.slug === curSlug) {
                    await core.organizations.activate(organization);
                    dispatch(organizationActions.activateOrganizationSuccess(organization));
                } else {
                    localStorage.removeItem('currentOrganization');
                    dispatch(organizationActions.activateOrganizationSuccess(null));
                }
            } catch (error: unknown) {
                if (error instanceof Error) {
                    dispatch(organizationActions.activateOrganizationFailed(curSlug, error.toString()));
                } else {
                    dispatch(organizationActions.activateOrganizationFailed(curSlug, 'Unknown error'));
                }
            }
        } else {
            dispatch(organizationActions.activateOrganizationSuccess(null));
        }
    };
}

export function createOrganizationAsync(
    organizationData: Store,
    onCreateSuccess?: (createdSlug: string) => void,
    onCreateFailed?: () => void,
): ThunkAction {
    return async function (dispatch) {
        const { slug } = organizationData;
        const organization = new core.classes.Organization(organizationData);
        try {
            const createdOrganization = await organization.save();
            dispatch(organizationActions.createOrganizationSuccess(createdOrganization));
            if (onCreateSuccess) onCreateSuccess(createdOrganization.slug);
        } catch (error) {
            if (onCreateFailed) onCreateFailed();
            dispatch(organizationActions.createOrganizationFailed(slug, error));
        }
    };
}

export function updateOrganizationAsync(organization: any): ThunkAction {
    return async function (dispatch) {
        dispatch(organizationActions.updateOrganization());

        try {
            const updatedOrganization = await organization.save();
            dispatch(organizationActions.updateOrganizationSuccess(updatedOrganization));
        } catch (error) {
            dispatch(organizationActions.updateOrganizationFailed(organization.slug, error));
        }
    };
}

export function removeOrganizationAsync(organization: any): ThunkAction {
    return async function (dispatch) {
        try {
            await organization.remove();
            localStorage.removeItem('currentOrganization');
            dispatch(organizationActions.removeOrganizationSuccess(organization.slug));
        } catch (error) {
            dispatch(organizationActions.removeOrganizationFailed(error, organization.slug));
        }
    };
}

export function inviteOrganizationMembersAsync(
    organization: any,
    members: { email: string; role: string }[],
    onFinish: () => void,
): ThunkAction {
    return async function (dispatch) {
        dispatch(organizationActions.inviteOrganizationMembers());
        try {
            for (let i = 0; i < members.length; i++) {
                const { email, role } = members[i];
                organization
                    .invite(email, role)
                    .then(() => {
                        dispatch(organizationActions.inviteOrganizationMemberSuccess(email));
                    })
                    .catch((error: any) => {
                        dispatch(organizationActions.inviteOrganizationMemberFailed(email, error));
                    })
                    .finally(() => {
                        if (i === members.length - 1) {
                            dispatch(organizationActions.inviteOrganizationMembersDone());
                            onFinish();
                        }
                    });
            }
        } catch (error) {
            dispatch(organizationActions.inviteOrganizationMembersFailed(error));
        }
    };
}

export function leaveOrganizationAsync(
    organization: any,
    onLeaveSuccess?: () => void,
): ThunkAction {
    return async function (dispatch, getState) {
        const { user } = getState().auth;
        dispatch(organizationActions.leaveOrganization());
        try {
            await organization.leave(user);
            dispatch(organizationActions.leaveOrganizationSuccess());
            if (onLeaveSuccess) onLeaveSuccess();
        } catch (error) {
            dispatch(organizationActions.leaveOrganizationFailed(error));
        }
    };
}

export function removeOrganizationMemberAsync(
    organization: any,
    { user, id }: { user: User; id: number },
    onFinish: () => void,
): ThunkAction {
    return async function (dispatch) {
        dispatch(organizationActions.removeOrganizationMember());
        try {
            await organization.deleteMembership(id);
            dispatch(organizationActions.removeOrganizationMemberSuccess());
            onFinish();
        } catch (error) {
            dispatch(organizationActions.removeOrganizationMemberFailed(user.username, error));
        }
    };
}

export function updateOrganizationMemberAsync(
    organization: any,
    { user, id }: { user: User; id: number },
    role: string,
    onFinish: () => void,
): ThunkAction {
    return async function (dispatch) {
        dispatch(organizationActions.updateOrganizationMember());
        try {
            await organization.updateMembership(id, role);
            dispatch(organizationActions.updateOrganizationMemberSuccess());
            onFinish();
        } catch (error) {
            dispatch(organizationActions.updateOrganizationMemberFailed(user.username, role, error));
        }
    };
}

export type OrganizationActions = ActionUnion<typeof organizationActions>;
