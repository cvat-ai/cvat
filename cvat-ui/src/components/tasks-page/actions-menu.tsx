// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useCallback } from 'react';
import { shallowEqual, useDispatch, useSelector } from 'react-redux';
import { useHistory } from 'react-router';
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
    deleteTaskAsync, getTasksAsync, switchMoveTaskModalVisible, updateTaskAsync,
} from 'actions/tasks-actions';
import { cloudStoragesActions } from 'actions/cloud-storage-actions';
import { ResourceUpdateTypes } from 'utils/enums';
import UserSelector from 'components/task-page/user-selector';

import OrganizationSelector from 'components/selectors/organization-selector';
import { confirmTransferModal } from 'utils/modals';
import { makeBulkOperationAsync } from 'actions/bulk-actions';
import TaskActionsItems from './actions-menu-items';

interface Props {
    taskInstance: Task;
    triggerElement: JSX.Element;
    dropdownTrigger?: ('click' | 'hover' | 'contextMenu')[];
    onUpdateTask?: (task: Task) => Promise<Task>;
}

function TaskActionsComponent(props: Readonly<Props>): JSX.Element {
    const {
        taskInstance, triggerElement, dropdownTrigger, onUpdateTask,
    } = props;
    const history = useHistory();
    const dispatch = useDispatch();
    const pluginActions = usePlugins((state: CombinedState) => state.plugins.components.taskActions.items, props);
    const {
        activeInference,
        mergingConsensus,
        currentOrganization,
        selectedIds,
        currentTasks,
        tasksQuery,
    } = useSelector((state: CombinedState) => ({
        activeInference: state.models.inferences[taskInstance.id],
        mergingConsensus: state.consensus.actions.merging,
        currentOrganization: state.organizations.current as Organization | null,
        selectedIds: state.tasks.selected,
        currentTasks: state.tasks.current,
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

    const collectObjectsForBulkUpdate = useCallback((): Task[] => {
        const taskIdsToUpdate = selectedIds.includes(taskInstance.id) ? selectedIds : [taskInstance.id];
        const tasksToUpdate = selectedIds.includes(taskInstance.id) ?
            currentTasks.filter((task) => taskIdsToUpdate.includes(task.id)) : [taskInstance];
        return tasksToUpdate;
    }, [selectedIds, currentTasks, taskInstance]);

    const onUpdateTaskAssignee = useCallback(async (assignee: User | null) => {
        stopEditField();
        const tasksToUpdate = collectObjectsForBulkUpdate()
            .filter((task) => task.assignee?.id !== assignee?.id);

        if (tasksToUpdate.length === 0) {
            return;
        }

        await dispatch(makeBulkOperationAsync(
            tasksToUpdate,
            async (task) => {
                task.assignee = assignee;
                if (onUpdateTask && task.id === taskInstance.id) {
                    onUpdateTask(task);
                } else {
                    await dispatch(updateTaskAsync(task, { assignee }));
                }
            },
            (task, idx, total) => `Updating assignee for task #${task.id} (${idx + 1}/${total})`,
        ));
    }, [taskInstance, stopEditField, dispatch, collectObjectsForBulkUpdate]);

    const onDeleteTask = useCallback(() => {
        const tasksToDelete = currentTasks.filter((task) => selectedIds.includes(task.id));
        Modal.confirm({
            title: isBulkMode ?
                `Delete ${tasksToDelete.length} selected tasks` :
                `The task ${taskInstance.id} will be deleted`,
            content: isBulkMode ?
                'All related data (images, annotations) for all selected tasks will be lost. Continue?' :
                'All related data (images, annotations) will be lost. Continue?',
            className: 'cvat-modal-confirm-delete-task',
            onOk: () => {
                dispatch(makeBulkOperationAsync(
                    tasksToDelete.length ? tasksToDelete : [taskInstance],
                    async (task) => {
                        await dispatch(deleteTaskAsync(task));
                    },
                    (task, idx, total) => `Deleting task #${task.id} (${idx + 1}/${total})`,
                ));
            },
            okButtonProps: {
                type: 'primary',
                danger: true,
            },
            okText: isBulkMode ? 'Delete selected' : 'Delete',
        });
    }, [taskInstance, currentTasks, selectedIds, isBulkMode]);

    const onUpdateTaskOrganization = useCallback((newOrganization: Organization | null) => {
        stopEditField();

        const tasksToUpdate = onUpdateTask ? [taskInstance] : collectObjectsForBulkUpdate();
        const updateCurrent = () => {
            taskInstance.organizationId = newOrganization?.id ?? null;
            onUpdateTask!(taskInstance).then(() => {
                history.push('/tasks');
            });
        };

        const updateBulk = () => {
            dispatch(makeBulkOperationAsync(
                tasksToUpdate,
                async (task) => {
                    task.organizationId = newOrganization?.id ?? null;
                    await dispatch(updateTaskAsync(task, {}, ResourceUpdateTypes.UPDATE_ORGANIZATION));
                },
                (task, idx, total) => `Updating organization for task #${task.id} (${idx + 1}/${total})`,
            )).then((processedCount: number) => {
                if (processedCount) {
                    // as for some tasks org has changed
                    // we need to fetch new tasks corresponding to the current org
                    dispatch(getTasksAsync(tasksQuery, false));
                }
            });
        };

        confirmTransferModal(
            tasksToUpdate,
            currentOrganization,
            newOrganization,
            () => {
                const updateFunction = onUpdateTask ? updateCurrent : updateBulk;
                if (
                    tasksToUpdate.some((task) => {
                        const { sourceStorage, targetStorage } = task;
                        return !!sourceStorage.cloudStorageId || !!targetStorage.cloudStorageId;
                    })
                ) {
                    dispatch(
                        cloudStoragesActions.openLinkedCloudStorageUpdatingModal(tasksToUpdate, updateFunction),
                    );
                } else {
                    updateFunction();
                }
            },
        );
    }, [currentOrganization, taskInstance, stopEditField, onUpdateTask, collectObjectsForBulkUpdate]);

    let menuItems;
    if (editField) {
        const fieldSelectors: Record<string, JSX.Element> = {
            assignee: (
                <UserSelector
                    value={isBulkMode ? null : taskInstance.assignee}
                    onSelect={onUpdateTaskAssignee}
                />
            ),
            organization: (
                <OrganizationSelector
                    defaultValue={isBulkMode ? undefined : currentOrganization?.slug}
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
