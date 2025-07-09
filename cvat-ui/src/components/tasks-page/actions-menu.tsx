// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useCallback } from 'react';
import { shallowEqual, useDispatch, useSelector } from 'react-redux';
import Modal from 'antd/lib/modal';
import Dropdown from 'antd/lib/dropdown';

import {
    RQStatus, Task, User, Organization,
} from 'cvat-core-wrapper';
import { useDropdownEditField, usePlugins } from 'utils/hooks';

import { CombinedState } from 'reducers';
import { exportActions } from 'actions/export-actions';
import { importActions } from 'actions/import-actions';
import { modelsActions } from 'actions/models-actions';
import { mergeConsensusJobsAsync } from 'actions/consensus-actions';

import {
    deleteTaskAsync, switchMoveTaskModalVisible,
    openLinkedCloudStorageUpdatingModal, updateTaskAsync,
    TaskUpdateTypes,
} from 'actions/tasks-actions';
import UserSelector from 'components/task-page/user-selector';

import OrganizationSelector from 'components/selectors/organization-selector';
import TaskActionsItems from './actions-menu-items';

interface Props {
    taskInstance: Task;
    triggerElement: JSX.Element;
}

function TaskActionsComponent(props: Props): JSX.Element {
    const { taskInstance, triggerElement } = props;
    const dispatch = useDispatch();

    const pluginActions = usePlugins((state: CombinedState) => state.plugins.components.taskActions.items, props);
    const {
        activeInference,
        mergingConsensus,
        currentOrganization,
    } = useSelector((state: CombinedState) => ({
        activeInference: state.models.inferences[taskInstance.id],
        mergingConsensus: state.consensus.actions.merging,
        currentOrganization: state.organizations.current,
    }), shallowEqual);

    const {
        dropdownOpen,
        editField,
        setDropdownOpen,
        startEditField,
        stopEditField,
        onOpenChange,
        onMenuClick,
    } = useDropdownEditField();

    const onOpenBugTracker = useCallback(() => {
        if (taskInstance.bugTracker) {
            window.open(taskInstance.bugTracker, '_blank', 'noopener noreferrer');
        }
    }, [taskInstance.bugTracker]);

    const onMergeConsensusJobs = useCallback(() => {
        if (taskInstance.consensusEnabled) {
            Modal.confirm({
                title: 'The consensus jobs will be merged',
                content: 'Existing annotations in parent jobs will be updated. Continue?',
                className: 'cvat-modal-confirm-consensus-merge-task',
                onOk: () => {
                    dispatch(mergeConsensusJobsAsync(taskInstance));
                },
                okButtonProps: {
                    type: 'primary',
                    danger: true,
                },
                okText: 'Merge',
            });
        }
    }, [taskInstance.consensusEnabled, taskInstance]);

    const onExportDataset = useCallback(() => {
        dispatch(exportActions.openExportDatasetModal(taskInstance));
    }, [taskInstance]);

    const onBackupTask = useCallback(() => {
        dispatch(exportActions.openExportBackupModal(taskInstance));
    }, [taskInstance]);

    const onUploadAnnotations = useCallback(() => {
        dispatch(importActions.openImportDatasetModal(taskInstance));
    }, [taskInstance]);

    const onRunAutoAnnotation = useCallback(() => {
        dispatch(modelsActions.showRunModelDialog(taskInstance));
    }, [taskInstance]);

    const onMoveTaskToProject = useCallback(() => {
        if (taskInstance.projectId === null) {
            dispatch(switchMoveTaskModalVisible(true, taskInstance.id));
        }
    }, [taskInstance.id]);

    const onUpdateTaskAssignee = useCallback((assignee: User | null) => {
        taskInstance.assignee = assignee;
        dispatch(updateTaskAsync(taskInstance, { assignee })).then(stopEditField);
    }, [taskInstance]);

    const onDeleteTask = useCallback(() => {
        Modal.confirm({
            title: `The task ${taskInstance.id} will be deleted`,
            content: 'All related data (images, annotations) will be lost. Continue?',
            className: 'cvat-modal-confirm-delete-task',
            onOk: () => {
                dispatch(deleteTaskAsync(taskInstance));
            },
            okButtonProps: {
                type: 'primary',
                danger: true,
            },
            okText: 'Delete',
        });
    }, [taskInstance]);

    const updateOrganization = useCallback((dstOrganizationId: number | null) => {
        taskInstance.organizationId = dstOrganizationId;
        if (
            taskInstance.cloudStorageId ||
            taskInstance.sourceStorage.cloudStorageId ||
            taskInstance.targetStorage.cloudStorageId
        ) {
            dispatch(openLinkedCloudStorageUpdatingModal(taskInstance));
        } else {
            dispatch(updateTaskAsync(taskInstance, {}, TaskUpdateTypes.UPDATE_ORGANIZATION))
                .then(stopEditField);
        }
    }, [taskInstance]);

    const onUpdateTaskOrganization = useCallback((dstOrganization: Organization | null) => {
        const dstOrganizationId = (dstOrganization) ? dstOrganization.id : dstOrganization;
        setDropdownOpen(false);

        if (currentOrganization) {
            Modal.confirm({
                title: `Other organization members will lose access to the task #${taskInstance.id}.`,
                content: (
                    `You are going to move a task to the ${
                        (dstOrganization) ? `${dstOrganization.slug} organization` : 'Personal sandbox'
                    }. Continue?`
                ),
                className: 'cvat-modal-confirm-task-transfer-between-workspaces',
                onOk: () => {
                    updateOrganization(dstOrganizationId);
                },
                okButtonProps: {
                    type: 'primary',
                    danger: true,
                },
                okText: 'Move anyway',
            });
        } else {
            updateOrganization(dstOrganizationId);
        }
    }, [taskInstance]);

    let menuItems;
    if (editField) {
        const fieldSelectors: Record<string, JSX.Element> = {
            assignee: (
                <UserSelector
                    value={taskInstance.assignee}
                    onSelect={(value: User | null): void => {
                        if (taskInstance.assignee?.id === value?.id) return;
                        onUpdateTaskAssignee(value);
                    }}
                />
            ),
            organization: (
                <OrganizationSelector
                    defaultValue={currentOrganization?.slug}
                    setNewOrganization={onUpdateTaskOrganization}
                />
            ),
        };
        menuItems = [{
            key: `${editField}-selector`,
            label: fieldSelectors[editField],
        }];
    } else {
        menuItems = TaskActionsItems({
            startEditField,
            taskId: taskInstance.id,
            projectId: taskInstance.projectId,
            isAutomaticAnnotationEnabled: (
                activeInference &&
                ![RQStatus.FAILED, RQStatus.FINISHED].includes(activeInference.status)
            ),
            isConsensusEnabled: taskInstance.consensusEnabled,
            isMergingConsensusEnabled: mergingConsensus[`task_${taskInstance.id}`],
            pluginActions,
            onMergeConsensusJobs: taskInstance.consensusEnabled ? onMergeConsensusJobs : null,
            onOpenBugTracker: taskInstance.bugTracker ? onOpenBugTracker : null,
            onUploadAnnotations,
            onExportDataset,
            onBackupTask,
            onRunAutoAnnotation,
            onMoveTaskToProject,
            onDeleteTask,
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
                className: 'cvat-actions-menu',
                items: menuItems,
                onClick: onMenuClick,
            }}
        >
            {triggerElement}
        </Dropdown>
    );
}

export default React.memo(TaskActionsComponent);
