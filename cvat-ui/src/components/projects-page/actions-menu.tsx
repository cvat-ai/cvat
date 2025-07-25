// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Dropdown from 'antd/lib/dropdown';
import Modal from 'antd/lib/modal';

import { Organization, Project, User } from 'cvat-core-wrapper';
import { useDropdownEditField, usePlugins } from 'utils/hooks';
import { CombinedState } from 'reducers';
import { deleteProjectAsync, updateProjectAsync } from 'actions/projects-actions';
import { cloudStoragesActions } from 'actions/cloud-storage-actions';
import { exportActions } from 'actions/export-actions';
import { importActions } from 'actions/import-actions';
import UserSelector from 'components/task-page/user-selector';
import OrganizationSelector from 'components/selectors/organization-selector';
import { ResourceUpdateTypes } from 'utils/enums';
import { confirmTransferModal } from 'utils/modals';

import ProjectActionsItems from './actions-menu-items';

interface Props {
    projectInstance: Project;
    triggerElement: JSX.Element;
}

function ProjectActionsComponent(props: Props): JSX.Element {
    const { projectInstance, triggerElement } = props;
    const dispatch = useDispatch();

    const pluginActions = usePlugins((state: CombinedState) => state.plugins.components.projectActions.items, props);

    const {
        dropdownOpen,
        editField,
        startEditField,
        stopEditField,
        onOpenChange,
        onMenuClick,
    } = useDropdownEditField();

    const currentOrganization = useSelector((state: CombinedState) => state.organizations.current);

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

    const updateOrganization = useCallback((dstOrganizationId: number | null) => {
        projectInstance.organizationId = dstOrganizationId;
        if (
            projectInstance.sourceStorage.cloudStorageId ||
            projectInstance.targetStorage.cloudStorageId
        ) {
            dispatch(cloudStoragesActions.openLinkedCloudStorageUpdatingModal(projectInstance));
        } else {
            dispatch(updateProjectAsync(projectInstance, ResourceUpdateTypes.UPDATE_ORGANIZATION));
        }
    }, [projectInstance]);

    const onUpdateProjectOrganization = useCallback((dstOrganization: Organization | null) => {
        stopEditField();
        confirmTransferModal(
            projectInstance, currentOrganization as Organization | null, dstOrganization, updateOrganization,
        );
    }, [projectInstance]);

    const onUpdateProjectAssignee = useCallback((assignee: User | null) => {
        projectInstance.assignee = assignee;
        dispatch(updateProjectAsync(projectInstance)).then(stopEditField);
    }, [projectInstance]);

    let menuItems;
    if (editField) {
        const fieldSelectors: Record<string, JSX.Element> = {
            assignee: (
                <UserSelector
                    value={projectInstance.assignee}
                    onSelect={(value: User | null): void => {
                        if (projectInstance.assignee?.id === value?.id) return;
                        onUpdateProjectAssignee(value);
                    }}
                />
            ),
            organization: (
                <OrganizationSelector
                    setNewOrganization={onUpdateProjectOrganization}
                />
            ),
        };
        menuItems = [{
            key: `${editField}-selector`,
            label: fieldSelectors[editField],
        }];
    } else {
        menuItems = ProjectActionsItems({
            startEditField,
            projectId: projectInstance.id,
            pluginActions,
            onExportDataset,
            onImportDataset,
            onBackupProject,
            onDeleteProject,
        }, props);
    }

    return (
        <Dropdown
            destroyPopupOnHide
            trigger={['click']}
            open={dropdownOpen}
            onOpenChange={onOpenChange}
            menu={{
                selectable: false,
                className: 'cvat-project-actions-menu',
                items: menuItems,
                onClick: onMenuClick,
            }}
        >
            {triggerElement}
        </Dropdown>
    );
}

export default React.memo(ProjectActionsComponent);
