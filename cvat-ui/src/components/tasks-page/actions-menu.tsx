// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useCallback } from 'react';
import { shallowEqual, useDispatch, useSelector } from 'react-redux';
import { useHistory } from 'react-router';
import Modal from 'antd/lib/modal';
import Dropdown from 'antd/lib/dropdown';

import { RQStatus, Task } from 'cvat-core-wrapper';
import { usePlugins } from 'utils/hooks';
import { CombinedState } from 'reducers';
import { exportActions } from 'actions/export-actions';
import { importActions } from 'actions/import-actions';
import { modelsActions } from 'actions/models-actions';
import { mergeConsensusJobsAsync } from 'actions/consensus-actions';
import { deleteTaskAsync, switchMoveTaskModalVisible } from 'actions/tasks-actions';
import TaskActionsItems from './actions-menu-items';

interface Props {
    taskInstance: Task;
    triggerElement: JSX.Element;
}

function TaskActionsComponent(props: Props): JSX.Element {
    const { taskInstance, triggerElement } = props;
    const dispatch = useDispatch();
    const history = useHistory();

    const pluginActions = usePlugins((state: CombinedState) => state.plugins.components.taskActions.items, props);
    const {
        activeInference,
        mergingConsensus,
    } = useSelector((state: CombinedState) => ({
        activeInference: state.models.inferences[taskInstance.id],
        mergingConsensus: state.consensus.actions.merging,
    }), shallowEqual);

    const onOpenBugTracker = taskInstance.bugTracker ? useCallback(() => {
        window.open(taskInstance.bugTracker as string, '_blank', 'noopener noreferrer');
    }, [taskInstance.bugTracker]) : null;

    const onOpenQualityControl = useCallback(() => {
        history.push(`/tasks/${taskInstance.id}/quality-control`);
    }, [taskInstance.id]);

    const onOpenConsensusManagement = taskInstance.consensusEnabled ? useCallback(() => {
        history.push(`/tasks/${taskInstance.id}/consensus`);
    }, [taskInstance.id]) : null;

    const onMergeConsensusJobs = taskInstance.consensusEnabled ? useCallback(() => {
        dispatch(mergeConsensusJobsAsync(taskInstance));
    }, [taskInstance]) : null;

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
        dispatch(switchMoveTaskModalVisible(true, taskInstance.id));
    }, [taskInstance.id]);

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

    return (
        <Dropdown
            destroyPopupOnHide
            trigger={['click']}
            menu={{
                selectable: false,
                className: 'cvat-actions-menu',
                items: TaskActionsItems({
                    isAutomaticAnnotationEnabled: (
                        activeInference &&
                        ![RQStatus.FAILED, RQStatus.FINISHED].includes(activeInference.status)
                    ),
                    isMergingConsensusEnabled: mergingConsensus[`task_${taskInstance.id}`],
                    pluginActions,
                    onOpenQualityControl,
                    onOpenConsensusManagement,
                    onMergeConsensusJobs,
                    onOpenBugTracker,
                    onUploadAnnotations,
                    onExportDataset,
                    onBackupTask,
                    onRunAutoAnnotation,
                    onMoveTaskToProject,
                    onDeleteTask,
                }, { ...props, history }),
            }}
        >
            {triggerElement}
        </Dropdown>
    );
}

export default React.memo(TaskActionsComponent);
