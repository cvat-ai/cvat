// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import Dropdown from 'antd/lib/dropdown';
import Modal from 'antd/lib/modal';

import { Project, User } from 'cvat-core-wrapper';
import { useDropdownEditField, usePlugins } from 'utils/hooks';
import { CombinedState } from 'reducers';
import { deleteProjectAsync, updateProjectAsync } from 'actions/projects-actions';
import { exportActions } from 'actions/export-actions';
import { importActions } from 'actions/import-actions';
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

    const onUpdateProjectAssignee = useCallback((assignee: User | null) => {
        projectInstance.assignee = assignee;
        dispatch(updateProjectAsync(projectInstance)).then(stopEditField);
    }, [projectInstance]);

    return (
        <Dropdown
            destroyPopupOnHide
            trigger={['click']}
            open={dropdownOpen}
            onOpenChange={onOpenChange}
            menu={{
                selectable: false,
                className: 'cvat-project-actions-menu',
                items: ProjectActionsItems({
                    editField,
                    startEditField,
                    projectID: projectInstance.id,
                    assignee: projectInstance.assignee,
                    pluginActions,
                    onExportDataset,
                    onImportDataset,
                    onBackupProject,
                    onDeleteProject,
                    onUpdateProjectAssignee,
                }, props),
                onClick: onMenuClick,
            }}
        >
            {triggerElement}
        </Dropdown>
    );
}

export default React.memo(ProjectActionsComponent);
