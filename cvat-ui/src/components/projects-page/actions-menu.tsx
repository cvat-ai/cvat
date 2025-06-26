// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import Dropdown from 'antd/lib/dropdown';
import Modal from 'antd/lib/modal';

import { Organization, Project } from 'cvat-core-wrapper';
import { usePlugins } from 'utils/hooks';
import { CombinedState } from 'reducers';
import {
    deleteProjectAsync, projectActions,
    updateProjectAsync, ProjectUpdateTypes,
} from 'actions/projects-actions';
import { exportActions } from 'actions/export-actions';
import { importActions } from 'actions/import-actions';
import { organizationActions } from 'actions/organization-actions';
import ProjectActionsItems from './actions-menu-items';

interface Props {
    projectInstance: Project;
    triggerElement: JSX.Element;
}

function ProjectActionsComponent(props: Props): JSX.Element {
    const { projectInstance, triggerElement } = props;
    const dispatch = useDispatch();

    const pluginActions = usePlugins((state: CombinedState) => state.plugins.components.projectActions.items, props);
    const onExportDataset = useCallback(() => {
        dispatch(exportActions.openExportDatasetModal(projectInstance));
    }, [projectInstance]);

    const onImportDataset = useCallback(() => {
        dispatch(importActions.openImportDatasetModal(projectInstance));
    }, [projectInstance]);

    const onBackupProject = useCallback(() => {
        dispatch(exportActions.openExportBackupModal(projectInstance));
    }, [projectInstance]);

    const onDeleteProject = useCallback((): void => {
        Modal.confirm({
            title: `The project ${projectInstance.id} will be deleted`,
            content: 'All related data (images, annotations) will be lost. Continue?',
            className: 'cvat-modal-confirm-remove-project',
            onOk: () => {
                dispatch(deleteProjectAsync(projectInstance));
            },
            okButtonProps: {
                type: 'primary',
                danger: true,
            },
            okText: 'Delete',
        });
    }, [projectInstance]);

    const updateWorkspace = useCallback((dstOrganizationId: number | null) => {
        projectInstance.organizationId = dstOrganizationId;
        if (
            projectInstance.sourceStorage.cloudStorageId ||
            projectInstance.targetStorage.cloudStorageId
        ) {
            dispatch(projectActions.openLinkedCloudStorageUpdatingModal(projectInstance));
        } else {
            dispatch(updateProjectAsync(projectInstance, ProjectUpdateTypes.UPDATE_ORGANIZATION));
        }
    }, [projectInstance]);

    const setNewOrganization = useCallback((dstOrganization: Organization | null) => {
        const isOrgWorkspace = Boolean(localStorage.getItem('currentOrganization'));
        const dstOrganizationId = (dstOrganization) ? dstOrganization.id : dstOrganization;

        if (isOrgWorkspace) {
            Modal.confirm({
                title: `Other organization members will lose access to the project #${
                    projectInstance.id
                }.`,
                content: (
                    `You are going to move a project to the ${
                        (dstOrganization) ? `${dstOrganization.slug} organization` : 'Personal sandbox'
                    }. Continue?`
                ),
                className: 'cvat-modal-confirm-project-transfer-between-workspaces',
                onOk: () => {
                    updateWorkspace(dstOrganizationId);
                },
                okButtonProps: {
                    type: 'primary',
                    danger: true,
                },
                okText: 'Move anyway',
            });
        } else {
            updateWorkspace(dstOrganizationId);
        }
    }, [projectInstance]);

    // TODO: update menu item after Kirill's PR is merged
    const onTransferProjectBetweenWorkspaces = useCallback(() => {
        dispatch(organizationActions.openSelectOrganizationModal(setNewOrganization));
    }, [projectInstance]);

    return (
        <Dropdown
            destroyPopupOnHide
            trigger={['click']}
            menu={{
                selectable: false,
                className: 'cvat-project-actions-menu',
                items: ProjectActionsItems({
                    projectID: projectInstance.id,
                    pluginActions,
                    onExportDataset,
                    onImportDataset,
                    onBackupProject,
                    onDeleteProject,
                    onTransferProjectBetweenWorkspaces,
                }, props),
            }}
        >
            {triggerElement}
        </Dropdown>
    );
}

export default React.memo(ProjectActionsComponent);
