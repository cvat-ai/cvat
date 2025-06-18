// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useCallback } from 'react'; // useState
import { shallowEqual, useDispatch, useSelector } from 'react-redux';
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
import OrganizationSelector from '../selectors/organization-selector';
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
    } = useSelector((state: CombinedState) => ({
        activeInference: state.models.inferences[taskInstance.id],
        mergingConsensus: state.consensus.actions.merging,
    }), shallowEqual);

    // const [cloudStorageChangeSchemeModal, setCloudStorageChangeSchemeModal] = useState(false);

    const onOpenBugTracker = useCallback(() => {
        if (taskInstance.bugTracker) {
            window.open(taskInstance.bugTracker as string, '_blank', 'noopener noreferrer');
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

    // TODO: update menu item after Kirill's PR is merged
    const onTransferTaskBetweenWorkspaces = useCallback(() => {
        const isOrgWorkspace = Boolean(localStorage.getItem('currentOrganization'));

        const selectWorkspaceModal = Modal.confirm({
            title: 'Select an organization',
            okButtonProps: {
                style: { display: 'none' },
            },
            content: (
                <OrganizationSelector
                    showSandboxOption={isOrgWorkspace}
                    setNewOrganization={(dstWorkspace) => {
                        taskInstance.organizationId = (dstWorkspace) ? dstWorkspace.id : null;
                        selectWorkspaceModal.destroy();
                        if (isOrgWorkspace) {
                            Modal.confirm({
                                title: `Other organization members will lose access to the task #${taskInstance.id}.`,
                                content: (
                                    `You are going to move a task to the ${
                                        (dstWorkspace) ? `${dstWorkspace.slug} organization` : 'Personal sandbox'
                                    }. Continue?`
                                ),
                                className: 'cvat-modal-confirm-task-transfer-between-workspaces',
                                onOk: () => {
                                    // if (
                                    //     taskInstance.cloudStorageId ||
                                    //     taskInstance.sourceStorage.cloudStorageId ||
                                    //     taskInstance.targetStorage.cloudStorageId
                                    // ) {
                                    //     <Modal
                                    //         title='A task is linked with a cloud storage'
                                    //         className='cvat-modal-choose-cloud-storage-change-scheme'
                                    //         open={cloudStorageChangeSchemeModal}
                                    //         footer={[
                                    //             <Button key='cancel' onClick={() => {}}>
                                    //                 Cancel
                                    //             </Button>,
                                    //             <Button key='move_and_detach' type='primary' onClick={() => {}}>
                                    //                 Move & detach
                                    //             </Button>,
                                    //             <Button
                                    //                 key='move_and_auto_match'
                                    //                 type='primary'
                                    //                 onClick={() => {}}
                                    //             >
                                    //                 Move & auto match
                                    //             </Button>,
                                    //         ]}
                                    //     >
                                    //         This task is linked with the cloud storage.
                                    //         Please choose how the transfer should be done.
                                    //     </Modal>;
                                    // } else {
                                    //     taskInstance.save();
                                    // }
                                    taskInstance.save();
                                },
                                okButtonProps: {
                                    type: 'primary',
                                    danger: true,
                                },
                                okText: 'Move anyway',
                            });
                        } else {
                            taskInstance.save();
                        }
                    }}
                />
            ),
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
                    taskID: taskInstance.id,
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
                    onTransferTaskBetweenWorkspaces: (
                        taskInstance.projectId === null ? onTransferTaskBetweenWorkspaces : null
                    ),
                }, props),
            }}
        >
            {triggerElement}
        </Dropdown>
    );
}

export default React.memo(TaskActionsComponent);
