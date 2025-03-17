// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { useHistory } from 'react-router';
import Dropdown from 'antd/lib/dropdown';
import Modal from 'antd/lib/modal';

import { Project } from 'cvat-core-wrapper';
import { usePlugins } from 'utils/hooks';
import { CombinedState } from 'reducers';
import { deleteProjectAsync } from 'actions/projects-actions';
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
    const history = useHistory();

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

    const onSetupWebhooks = useCallback(() => {
        history.push({ pathname: `/projects/${projectInstance.id}/webhooks` });
    }, [projectInstance.id]);

    const onOpenQualityControl = useCallback(() => {
        history.push(`/projects/${projectInstance.id}/quality-control`);
    }, [projectInstance.id]);

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

    return (
        <Dropdown
            destroyPopupOnHide
            trigger={['click']}
            menu={{
                selectable: false,
                className: 'cvat-project-actions-menu',
                items: ProjectActionsItems({
                    pluginActions,
                    onExportDataset,
                    onImportDataset,
                    onBackupProject,
                    onSetupWebhooks,
                    onDeleteProject,
                    onOpenQualityControl,
                }, { ...props, history }),
            }}
        >
            {triggerElement}
        </Dropdown>
    );
}

export default React.memo(ProjectActionsComponent);
