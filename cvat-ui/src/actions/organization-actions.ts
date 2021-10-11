// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

import { Store } from 'antd/lib/form/interface';
import getCore from 'cvat-core-wrapper';
import { ActionUnion, createAction, ThunkAction } from 'utils/redux';

const core = getCore();

export enum OrganizationActionsTypes {
    GET_ORGANIZATIONS = 'GET_ORGANIZATIONS',
    GET_ORGANIZATIONS_SUCCESS = 'GET_ORGANIZATIONS_SUCCESS',
    GET_ORGANIZATIONS_FAILED = 'GET_ORGANIZATIONS_FAILED',
    ACTIVATE_ORGANIZATION = 'ACTIVATE_ORGANIZATION',
    ACTIVATE_ORGANIZATION_SUCCESS = 'ACTIVATE_ORGANIZATION_SUCCESS',
    ACTIVATE_ORGANIZATION_FAILED = 'ACTIVATE_ORGANIZATION_FAILED',
    CREATE_ORGANIZATION = 'CREATE_ORGANIZATION',
    CREATE_ORGANIZATION_SUCCESS = 'CREATE_ORGANIZATION_SUCCESS',
    CREATE_ORGANIZATION_FAILED = 'CREATE_ORGANIZATION_FAILED',
    REMOVE_ORGANIZATION_SUCCESS = 'REMOVE_ORGANIZATION_SUCCESS',
    REMOVE_ORGANIZATION_FAILED = 'REMOVE_ORGANIZATION_FAILED',
}

const organizationActions = {
    getOrganizations: () => createAction(OrganizationActionsTypes.GET_ORGANIZATIONS),
    getOrganizationsSuccess: (list: any[]) =>
        createAction(OrganizationActionsTypes.GET_ORGANIZATIONS_SUCCESS, { list }),
    getOrganizationsFailed: (error: any) => createAction(OrganizationActionsTypes.GET_ORGANIZATIONS_FAILED, { error }),
    createOrganization: () => createAction(OrganizationActionsTypes.CREATE_ORGANIZATION),
    createOrganizationSuccess: (organization: any) =>
        createAction(OrganizationActionsTypes.CREATE_ORGANIZATION_SUCCESS, { organization }),
    createOrganizationFailed: (slug: string, error: any) =>
        createAction(OrganizationActionsTypes.CREATE_ORGANIZATION_FAILED, { slug, error }),
    activateOrganization: () => createAction(OrganizationActionsTypes.ACTIVATE_ORGANIZATION),
    activateOrganizationSuccess: (organization: any | null) =>
        createAction(OrganizationActionsTypes.ACTIVATE_ORGANIZATION_SUCCESS, { organization }),
    activateOrganizationFailed: (error: any, slug: string | null) =>
        createAction(OrganizationActionsTypes.ACTIVATE_ORGANIZATION_FAILED, { slug, error }),
    removeOrganizationSuccess: (slug: string) =>
        createAction(OrganizationActionsTypes.REMOVE_ORGANIZATION_SUCCESS, { slug }),
    removeOrganizationFailed: (error: any, slug: string) =>
        createAction(OrganizationActionsTypes.REMOVE_ORGANIZATION_FAILED, { error, slug }),
};

export function activateOrganizationAsync(organizations: any[]): ThunkAction {
    return async function (dispatch) {
        dispatch(organizationActions.activateOrganization());
        try {
            const curSlug = localStorage.getItem('currentOrganization');
            if (curSlug) {
                const currentOrganization = organizations.find((organization) => organization.slug === curSlug);
                if (!currentOrganization) {
                    // not valid anymore
                    localStorage.removeItem('currentOrganization');
                    dispatch(organizationActions.activateOrganizationSuccess(null));
                }
                await core.organizations.activate(currentOrganization);
                dispatch(organizationActions.activateOrganizationSuccess(currentOrganization));
            } else {
                dispatch(organizationActions.activateOrganizationSuccess(null));
            }
        } catch (error) {
            dispatch(
                organizationActions.activateOrganizationFailed(error, localStorage.getItem('currentOrganization')),
            );
        }
    };
}

export function getOrganizationsAsync(): ThunkAction {
    return async function (dispatch) {
        dispatch(organizationActions.getOrganizations());

        try {
            const organizations = await core.organizations.get();
            dispatch(organizationActions.getOrganizationsSuccess(organizations));
            dispatch(activateOrganizationAsync(organizations));
        } catch (error) {
            dispatch(organizationActions.getOrganizationsFailed(error));
        }
    };
}

export function createOrganizationAsync(
    organizationData: Store,
    onCreateSuccess?: (createdSlug: string) => void,
): ThunkAction {
    return async function (dispatch) {
        const { slug } = organizationData;
        const organization = new core.classes.Organization(organizationData);
        dispatch(organizationActions.createOrganization());

        try {
            const createdOrganization = await organization.save();
            dispatch(organizationActions.createOrganizationSuccess(createdOrganization));
            if (onCreateSuccess) onCreateSuccess(createdOrganization.slug);
        } catch (error) {
            dispatch(organizationActions.createOrganizationFailed(slug, error));
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

export type OrganizationActions = ActionUnion<typeof organizationActions>;
