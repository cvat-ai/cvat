// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useCallback } from 'react';
import { shallowEqual, useDispatch, useSelector } from 'react-redux';
import Modal from 'antd/lib/modal';
import Dropdown from 'antd/lib/dropdown';

import { RQStatus, Task, User } from 'cvat-core-wrapper';
import { useDropdownEditField, usePlugins } from 'utils/hooks';
import { CombinedState } from 'reducers';
import { exportActions } from 'actions/export-actions';
import { importActions } from 'actions/import-actions';
import { modelsActions } from 'actions/models-actions';
import { mergeConsensusJobsAsync } from 'actions/consensus-actions';
import { deleteTaskAsync, switchMoveTaskModalVisible, updateTaskAsync } from 'actions/tasks-actions';
import UserSelector from 'components/task-page/user-selector';
import { makeBulkOperationAsync } from 'actions/selection-actions';
import TaskActionsItems from './actions-menu-items';

interface Props {
    taskInstance: Task;
    triggerElement: JSX.Element;
    dropdownTrigger?: ('click' | 'hover' | 'contextMenu')[];
}

function TaskActionsComponent(props: Readonly<Props>): JSX.Element {
    const { taskInstance, triggerElement, dropdownTrigger } = props;
    const dispatch = useDispatch();

    const selectedIds = useSelector((state: CombinedState) => state.selection.selected);
    const allTasks = useSelector((state: CombinedState) => state.tasks.current);

    const pluginActions = usePlugins((state: CombinedState) => state.plugins.components.taskActions.items, props);
    const {
        activeInference,
        mergingConsensus,
    } = useSelector((state: CombinedState) => ({
        activeInference: state.models.inferences[taskInstance.id],
        mergingConsensus: state.consensus.actions.merging,
    }), shallowEqual);

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

    const onUpdateTaskAssignee = useCallback(async (assignee: User | null) => {
        const allTaskIDs = selectedIds.includes(taskInstance.id) ? selectedIds : [taskInstance.id, ...selectedIds];
        const tasksToUpdate = allTasks.filter((task) => allTaskIDs.includes(task.id));

        await dispatch(makeBulkOperationAsync(
            tasksToUpdate,
            async (task) => {
                task.assignee = assignee;
                await dispatch(updateTaskAsync(task, { assignee }));
            },
            (task, idx, total) => `Updating assignee for task ${task.id} (${idx + 1}/${total})`,
        ));

        stopEditField();
    }, [taskInstance, selectedIds, allTasks, stopEditField, dispatch]);

    const onDeleteTask = useCallback(() => {
        const tasksToDelete = allTasks.filter((task) => selectedIds.includes(task.id));
        const isBulk = tasksToDelete.length > 1;
        Modal.confirm({
            title: isBulk ?
                `Delete ${tasksToDelete.length} selected tasks` :
                `The task ${taskInstance.id} will be deleted`,
            content: isBulk ?
                'All related data (images, annotations) for all selected tasks will be lost. Continue?' :
                'All related data (images, annotations) will be lost. Continue?',
            className: 'cvat-modal-confirm-delete-task',
            onOk: () => {
                setTimeout(() => {
                    dispatch(makeBulkOperationAsync(
                        tasksToDelete.length ? tasksToDelete : [taskInstance],
                        async (task) => {
                            await dispatch(deleteTaskAsync(task));
                        },
                        (task, idx, total) => `Deleting task ${task.id} (${idx + 1}/${total})`,
                    ));
                }, 0);
            },
            okButtonProps: {
                type: 'primary',
                danger: true,
            },
            okText: isBulk ? 'Delete selected' : 'Delete',
        });
    }, [taskInstance, allTasks, selectedIds, dispatch]);

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
        };
        menuItems = [{
            key: `${editField}-selector`,
            label: fieldSelectors[editField],
        }];
    } else {
        menuItems = TaskActionsItems({
            startEditField,
            taskId: taskInstance.id,
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
            onMoveTaskToProject: taskInstance.projectId === null ? onMoveTaskToProject : null,
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
