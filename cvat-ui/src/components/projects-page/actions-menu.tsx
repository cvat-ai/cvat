// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useCallback } from 'react';
import { useDispatch, useSelector, shallowEqual } from 'react-redux';
import { useHistory } from 'react-router';
import Dropdown from 'antd/lib/dropdown';
import Modal from 'antd/lib/modal';

import { Organization, Project, User } from 'cvat-core-wrapper';
import { useDropdownEditField, usePlugins } from 'utils/hooks';
import { CombinedState } from 'reducers';
import { deleteProjectAsync, getProjectsAsync, updateProjectAsync } from 'actions/projects-actions';
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
    onUpdateProject?: (project: Project) => Promise<Project>;
}

function ProjectActionsComponent(props: Readonly<Props>): JSX.Element {
    const {
        projectInstance, triggerElement, dropdownTrigger, onUpdateProject,
    } = props;

    const history = useHistory();
    const dispatch = useDispatch();
    const pluginActions = usePlugins((state: CombinedState) => state.plugins.components.projectActions.items, props);

    const {
        selectedIds,
        currentProjects,
        currentOrganization,
        projectsQuery,
        tasksQuery,
    } = useSelector((state: CombinedState) => ({
        selectedIds: state.projects.selected,
        currentProjects: state.projects.current,
        currentOrganization: state.organizations.current as Organization | null,
        projectsQuery: state.projects.gettingQuery,
        tasksQuery: state.tasks.gettingQuery,
    }), shallowEqual);

    const isBulkMode = selectedIds.length > 1;
    const {
        dropdownOpen,
        editField,
        startEditField,
        stopEditField,
        onOpenChange,
        onMenuClick,
    } = useDropdownEditField();

    const onExportDataset = useCallback(() => {
        dispatch(exportActions.openExportDatasetModal(projectInstance));
    }, [projectInstance]);

    const onImportDataset = useCallback(() => {
        dispatch(importActions.openImportDatasetModal(projectInstance));
    }, [projectInstance]);

    const onBackupProject = useCallback(() => {
        dispatch(exportActions.openExportBackupModal(projectInstance));
    }, [projectInstance]);

    const collectObjectsForBulkUpdate = useCallback((): Project[] => {
        const projectIdsToUpdate = selectedIds.includes(projectInstance.id) ? selectedIds : [projectInstance.id];
        const projectsToUpdate = selectedIds.includes(projectInstance.id) ?
            currentProjects.filter((project) => projectIdsToUpdate.includes(project.id)) : [projectInstance];
        return projectsToUpdate;
    }, [selectedIds, currentProjects, projectInstance]);

    const onUpdateProjectAssignee = useCallback((assignee: User | null) => {
        stopEditField();

        if (onUpdateProject) {
            // details page
            projectInstance.assignee = assignee;
            onUpdateProject(projectInstance);
        } else {
            const projectsToUpdate = collectObjectsForBulkUpdate()
                .filter((project) => project.assignee?.id !== assignee?.id);

            if (projectsToUpdate.length === 0) {
                return;
            }

            dispatch(makeBulkOperationAsync(
                projectsToUpdate,
                async (project) => {
                    project.assignee = assignee;
                    await dispatch(updateProjectAsync(project));
                },
                (project, idx, total) => `Updating assignee for project #${project.id} (${idx + 1}/${total})`,
            ));
        }
    }, [projectInstance, stopEditField, dispatch, collectObjectsForBulkUpdate, onUpdateProject]);

    const onUpdateProjectOrganization = useCallback((newOrganization: Organization | null) => {
        stopEditField();

        const projectsToUpdate = onUpdateProject ? [projectInstance] : collectObjectsForBulkUpdate();
        const updateCurrent = () => {
            projectInstance.organizationId = newOrganization?.id ?? null;
            onUpdateProject!(projectInstance).then(() => {
                history.push('/projects');
            });
        };

        const updateBulk = () => {
            dispatch(makeBulkOperationAsync(
                projectsToUpdate,
                async (project) => {
                    project.organizationId = newOrganization?.id ?? null;
                    await dispatch(updateProjectAsync(project, ResourceUpdateTypes.UPDATE_ORGANIZATION));
                },
                (project, idx, total) => `Updating organization for project #${project.id} (${idx + 1}/${total})`,
            )).then((processedCount: number) => {
                if (processedCount) {
                    // as for some projects org has changed
                    // we need to fetch new projects corresponding to the current org
                    dispatch(getProjectsAsync(projectsQuery, tasksQuery));
                }
            });
        };

        confirmTransferModal(
            projectsToUpdate,
            currentOrganization,
            newOrganization,
            () => {
                const updateFunction = onUpdateProject ? updateCurrent : updateBulk;
                if (
                    projectsToUpdate.some((project) => {
                        const { sourceStorage, targetStorage } = project;
                        return !!sourceStorage.cloudStorageId || !!targetStorage.cloudStorageId;
                    })
                ) {
                    dispatch(
                        cloudStoragesActions.openLinkedCloudStorageUpdatingModal(projectsToUpdate, updateFunction),
                    );
                } else {
                    updateFunction();
                }
            },
        );
    }, [currentOrganization, projectInstance, stopEditField, onUpdateProject, collectObjectsForBulkUpdate]);

    const onDeleteProject = useCallback((): void => {
        const projectsToDelete = currentProjects.filter((project) => selectedIds.includes(project.id));
        Modal.confirm({
            title: isBulkMode ?
                `Delete ${projectsToDelete.length} selected projects` :
                `The project ${projectInstance.id} will be deleted`,
            content: isBulkMode ?
                'All related data (images, annotations) for all selected projects will be lost. Continue?' :
                'All related data (images, annotations) will be lost. Continue?',
            className: 'cvat-modal-confirm-remove-project',
            onOk: () => {
                dispatch(makeBulkOperationAsync(
                    projectsToDelete.length ? projectsToDelete : [projectInstance],
                    async (project) => {
                        await dispatch(deleteProjectAsync(project));
                    },
                    (project, idx, total) => `Deleting project #${project.id} (${idx + 1}/${total})`,
                ));
            },
            okButtonProps: {
                type: 'primary',
                danger: true,
            },
            okText: isBulkMode ? 'Delete selected' : 'Delete',
        });
    }, [projectInstance, currentProjects, selectedIds, isBulkMode]);
    let menuItems;
    if (editField) {
        const fieldSelectors: Record<string, JSX.Element> = {
            assignee: (
                <UserSelector
                    value={isBulkMode ? null : projectInstance.assignee}
                    onSelect={onUpdateProjectAssignee}
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
