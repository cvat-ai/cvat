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

import { makeBulkOperationAsync } from 'actions/bulk-actions';
import ProjectActionsItems from './actions-menu-items';

interface Props {
    projectInstance: Project;
    triggerElement: JSX.Element;
    dropdownTrigger?: ('click' | 'hover' | 'contextMenu')[];
    onUpdateProject?: (project: Project) => Promise<void>;
}

function ProjectActionsComponent(props: Readonly<Props>): JSX.Element {
    const {
        projectInstance, triggerElement, dropdownTrigger, onUpdateProject,
    } = props;
    const dispatch = useDispatch();

    const selectedIds = useSelector((state: CombinedState) => state.projects.selected);
    const isBulkMode = selectedIds.length > 1;
    const allProjects = useSelector((state: CombinedState) => state.projects.current);

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

    const onUpdateProjectAssignee = useCallback((assignee: User | null) => {
        const allProjectIDs = selectedIds.includes(projectInstance.id) ?
            selectedIds :
            [projectInstance.id, ...selectedIds];

        const projectsToUpdate = selectedIds.includes(projectInstance.id) ?
            allProjects.filter((project) => allProjectIDs.includes(project.id)) :
            [projectInstance];

        const projectsNeedingUpdate = projectsToUpdate.filter((project) => project.assignee?.id !== assignee?.id);

        stopEditField();
        if (projectsNeedingUpdate.length === 0) {
            return;
        }

        dispatch(makeBulkOperationAsync(
            projectsNeedingUpdate,
            async (project) => {
                project.assignee = assignee;
                if (onUpdateProject && project.id === projectInstance.id) {
                    onUpdateProject(project);
                } else {
                    await dispatch(updateProjectAsync(project));
                }
            },
            (project, idx, total) => `Updating assignee for project #${project.id} (${idx + 1}/${total})`,
        ));
    }, [projectInstance, selectedIds, allProjects, stopEditField, dispatch]);

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

    const onDeleteProject = useCallback((): void => {
        const projectsToDelete = allProjects.filter((project) => selectedIds.includes(project.id));
        Modal.confirm({
            title: isBulkMode ?
                `Delete ${projectsToDelete.length} selected projects` :
                `The project ${projectInstance.id} will be deleted`,
            content: isBulkMode ?
                'All related data (images, annotations) for all selected projects will be lost. Continue?' :
                'All related data (images, annotations) will be lost. Continue?',
            className: 'cvat-modal-confirm-remove-project',
            onOk: () => {
                setTimeout(() => {
                    dispatch(makeBulkOperationAsync(
                        projectsToDelete.length ? projectsToDelete : [projectInstance],
                        async (project) => {
                            await dispatch(deleteProjectAsync(project));
                        },
                        (project, idx, total) => `Deleting project #${project.id} (${idx + 1}/${total})`,
                    ));
                }, 0);
            },
            okButtonProps: {
                type: 'primary',
                danger: true,
            },
            okText: isBulkMode ? 'Delete selected' : 'Delete',
        });
    }, [projectInstance, allProjects, selectedIds, isBulkMode]);
    let menuItems;
    if (editField) {
        const fieldSelectors: Record<string, JSX.Element> = {
            assignee: (
                <UserSelector
                    value={isBulkMode ? null : projectInstance.assignee}
                    onSelect={(value: User | null): void => {
                        onUpdateProjectAssignee(value);
                    }}
                />
            ),
            organization: (
                <OrganizationSelector
                    defaultValue={currentOrganization?.slug}
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
            selectedIds,
        }, props);
    }

    return (
        <Dropdown
            destroyPopupOnHide
            trigger={dropdownTrigger || ['click']}
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
