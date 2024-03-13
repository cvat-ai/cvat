// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { ActionUnion, ThunkAction, createAction } from 'utils/redux';
import { CombinedState, InvitationsQuery } from 'reducers';
import { Invitation, Organization, getCore } from 'cvat-core-wrapper';

const cvat = getCore();

export enum InvitationsActionTypes {
    GET_INVITATIONS = 'GET_INVITATIONS',
    GET_INVITATIONS_SUCCESS = 'GET_INVITATIONS_SUCCESS',
    GET_INVITATIONS_FAILED = 'GET_INVITATIONS_FAILED',
    ACCEPT_INVITATION = 'ACCEPT_INVITATION',
    ACCEPT_INVITATION_SUCCESS = 'ACCEPT_INVITATION_SUCCESS',
    ACCEPT_INVITATION_FAILED = 'ACCEPT_INVITATION_FAILED',
    DECLINE_INVITATION = 'DECLINE_INVITATION',
    DECLINE_INVITATION_SUCCESS = 'DECLINE_INVITATION_SUCCESS',
    DECLINE_INVITATION_FAILED = 'DECLINE_INVITATION_FAILED',
    RESEND_INVITATION = 'RESEND_INVITATION',
    RESEND_INVITATION_SUCCESS = 'RESEND_INVITATION_SUCCESS',
    RESEND_INVITATION_FAILED = 'RESEND_INVITATION_FAILED',
}

const invitationActions = {
    getInvitations: (query: InvitationsQuery) => createAction(InvitationsActionTypes.GET_INVITATIONS, { query }),
    getInvitationsSuccess: (invitations: Invitation[], showNotification: boolean) => (
        createAction(InvitationsActionTypes.GET_INVITATIONS_SUCCESS, { invitations, showNotification })
    ),
    getInvitationsFailed: (error: any) => createAction(InvitationsActionTypes.GET_INVITATIONS_FAILED, { error }),
    acceptInvitation: () => createAction(InvitationsActionTypes.ACCEPT_INVITATION),
    acceptInvitationSuccess: (orgSlug: string) => createAction(
        InvitationsActionTypes.ACCEPT_INVITATION_SUCCESS, { orgSlug },
    ),
    acceptInvitationFailed: (error: any) => createAction(InvitationsActionTypes.ACCEPT_INVITATION_FAILED, { error }),
    declineInvitation: () => createAction(InvitationsActionTypes.DECLINE_INVITATION),
    declineInvitationSuccess: () => createAction(InvitationsActionTypes.DECLINE_INVITATION_SUCCESS),
    declineInvitationFailed: (error: any) => createAction(InvitationsActionTypes.DECLINE_INVITATION_FAILED, { error }),
    resendInvitation: () => createAction(InvitationsActionTypes.RESEND_INVITATION),
    resendInvitationSuccess: () => createAction(
        InvitationsActionTypes.RESEND_INVITATION_SUCCESS,
    ),
    resendInvitationFailed: (error: any) => createAction(
        InvitationsActionTypes.RESEND_INVITATION_FAILED, { error },
    ),
};

export type InvitationActions = ActionUnion<typeof invitationActions>;

export function getInvitationsAsync(query: InvitationsQuery, showNotification = false): ThunkAction {
    return async function (dispatch, getState) {
        const state: CombinedState = getState();
        const userID = state.auth.user.id;

        dispatch(invitationActions.getInvitations(query));

        try {
            const invitations = await cvat.organizations.invitations({
                ...query,
                filter: `{"and":[{"==":[{"var":"user_id"},"${userID}"]}, {"==":[{"var":"accepted"},false]}]}`,
            });
            const hasActiveInvitations = invitations.length !== 0 &&
                                        invitations.some((invitation: Invitation) => !invitation.expired);
            dispatch(invitationActions.getInvitationsSuccess(
                invitations, hasActiveInvitations && showNotification,
            ));
        } catch (error: unknown) {
            if (error instanceof Error) {
                dispatch(invitationActions.getInvitationsFailed(error.message));
            } else {
                dispatch(invitationActions.getInvitationsFailed('Unknown error'));
            }
        }
    };
}

export const acceptInvitationAsync = (
    key: string,
    onSuccess?: (orgSlug: string) => void,
): ThunkAction => async (dispatch) => {
    dispatch(invitationActions.acceptInvitation());

    try {
        const orgSlug = await cvat.organizations.acceptInvitation(key);

        if (onSuccess) onSuccess(orgSlug);
        dispatch(invitationActions.acceptInvitationSuccess(orgSlug));
    } catch (error) {
        dispatch(invitationActions.acceptInvitationFailed(error));
    }
};

export const declineInvitationAsync = (
    key: string,
): ThunkAction => async (dispatch) => {
    dispatch(invitationActions.declineInvitation());

    try {
        await cvat.organizations.declineInvitation(key);
        dispatch(invitationActions.declineInvitationSuccess());
    } catch (error) {
        dispatch(invitationActions.declineInvitationFailed(error));
    }
};

export function resendInvitationAsync(
    organization: Organization,
    invitationKey: string,
    onFinish?: () => void,
): ThunkAction {
    return async function (dispatch) {
        dispatch(invitationActions.resendInvitation());

        try {
            await organization.resendInvitation(invitationKey);
            dispatch(invitationActions.resendInvitationSuccess());
            if (onFinish) onFinish();
        } catch (error) {
            dispatch(invitationActions.resendInvitationFailed(error));
        }
    };
}
