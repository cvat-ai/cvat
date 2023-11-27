// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { ActionUnion, ThunkAction, createAction } from 'utils/redux';
import { CombinedState } from 'reducers';
import { Invitation, getCore } from 'cvat-core-wrapper';

const cvat = getCore();

export enum InvitationsActionTypes {
    GET_INVITATIONS = 'GET_INVITATIONS',
    GET_INVITATIONS_SUCCESS = 'GET_INVITATIONS_SUCCESS',
    GET_INVITATIONS_FAILED = 'GET_INVITATIONS_FAILED',
    ACCEPT_INVITATION = 'ACCEPT_INVITATION',
    ACCEPT_INVITATION_SUCCESS = 'ACCEPT_INVITATION_SUCCESS',
    ACCEPT_INVITATION_FAILED = 'ACCEPT_INVITATION_FAILED',
    REJECT_INVITATION = 'REJECT_INVITATION',
    REJECT_INVITATION_SUCCESS = 'REJECT_INVITATION_SUCCESS',
    REJECT_INVITATION_FAILED = 'REJECT_INVITATION_FAILED',
    RESEND_INVITATION = 'RESEND_INVITATION',
    RESEND_INVITATION_SUCCESS = 'RESEND_INVITATION_SUCCESS',
    RESEND_INVITATION_FAILED = 'RESEND_INVITATION_FAILED',
}

const invitationActions = {
    getInvitations: () => createAction(InvitationsActionTypes.GET_INVITATIONS),
    getInvitationsSuccess: (invitations: Invitation[], showNotification: boolean) => (
        createAction(InvitationsActionTypes.GET_INVITATIONS_SUCCESS, { invitations, showNotification })
    ),
    getInvitationsFailed: (error: any) => createAction(InvitationsActionTypes.GET_INVITATIONS_FAILED, { error }),
    acceptInvitation: () => createAction(InvitationsActionTypes.ACCEPT_INVITATION),
    acceptInvitationSuccess: (orgSlug: string) => createAction(
        InvitationsActionTypes.ACCEPT_INVITATION_SUCCESS, { orgSlug },
    ),
    acceptInvitationFailed: (error: any) => createAction(InvitationsActionTypes.ACCEPT_INVITATION_FAILED, { error }),
    rejectInvitation: () => createAction(InvitationsActionTypes.REJECT_INVITATION),
    rejectInvitationSuccess: () => createAction(InvitationsActionTypes.REJECT_INVITATION_SUCCESS),
    rejectInvitationFailed: (error: any) => createAction(InvitationsActionTypes.REJECT_INVITATION_FAILED, { error }),
    resendInvitation: () => createAction(InvitationsActionTypes.RESEND_INVITATION),
    resendInvitationSuccess: () => createAction(
        InvitationsActionTypes.RESEND_INVITATION_SUCCESS,
    ),
    resendInvitationFailed: (error: any) => createAction(
        InvitationsActionTypes.RESEND_INVITATION_FAILED, { error },
    ),
};

export type InvitationActions = ActionUnion<typeof invitationActions>;

export function getInvitationsAsync(showNotification = false): ThunkAction {
    return async function (dispatch, getState) {
        const state: CombinedState = getState();
        const userID = state.auth.user.id;
        dispatch(invitationActions.getInvitations());

        try {
            const invitations = await cvat.organizations.invitations({
                filter: `{"and":[{"==":[{"var":"user_id"},"${userID}"]}, {"==":[{"var":"accepted"},false]}]}`,
            });
            dispatch(invitationActions.getInvitationsSuccess(invitations, showNotification));
        } catch (error: unknown) {
            if (error instanceof Error) {
                dispatch(invitationActions.getInvitationsFailed(error.toString()));
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
        const orgSlug = await cvat.organizations.acceptInvitation(
            key,
        );

        if (onSuccess) onSuccess(orgSlug);
        dispatch(invitationActions.acceptInvitationSuccess(orgSlug));
    } catch (error) {
        dispatch(invitationActions.acceptInvitationFailed(error));
    }
};

export const rejectInvitationAsync = (
    key: string,
): ThunkAction => async (dispatch) => {
    dispatch(invitationActions.rejectInvitation());

    try {
        await cvat.organizations.rejectInvitation(
            key,
        );

        dispatch(invitationActions.rejectInvitationSuccess());
    } catch (error) {
        dispatch(invitationActions.rejectInvitationFailed(error));
    }
};

export function resendInvitationAsync(
    organization: any,
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
