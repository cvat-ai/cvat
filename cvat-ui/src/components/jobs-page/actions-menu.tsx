// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Dropdown from 'antd/lib/dropdown';
import Modal from 'antd/lib/modal';

import { Job, JobType } from 'cvat-core-wrapper';
import { usePlugins } from 'utils/hooks';
import { CombinedState } from 'reducers';
import { exportActions } from 'actions/export-actions';
import { importActions } from 'actions/import-actions';
import { mergeConsensusJobsAsync } from 'actions/consensus-actions';
import { deleteJobAsync } from 'actions/jobs-actions';

import { makeKey } from 'reducers/consensus-reducer';
import JobActionsItems from './actions-menu-items';

interface Props {
    jobInstance: Job;
    consensusJobsPresent: boolean;
    triggerElement: JSX.Element;
}

function JobActionsComponent(props: Props): JSX.Element {
    const { jobInstance, triggerElement, consensusJobsPresent } = props;
    const dispatch = useDispatch();

    const pluginActions = usePlugins((state: CombinedState) => state.plugins.components.jobActions.items, props);
    const mergingConsensus = useSelector((state: CombinedState) => state.consensus.actions.merging);

    const onOpenBugTracker = useCallback(() => {
        if (jobInstance.bugTracker) {
            window.open(jobInstance.bugTracker as string, '_blank', 'noopener noreferrer');
        }
    }, [jobInstance.bugTracker]);

    const onImportAnnotations = useCallback(() => {
        dispatch(importActions.openImportDatasetModal(jobInstance));
    }, [jobInstance]);

    const onExportAnnotations = useCallback(() => {
        dispatch(exportActions.openExportDatasetModal(jobInstance));
    }, [jobInstance]);

    const onMergeConsensusJob = useCallback(() => {
        if (consensusJobsPresent && jobInstance.parentJobId === null) {
            Modal.confirm({
                title: 'The consensus job will be merged',
                content: 'Existing annotations in the parent job will be updated. Continue?',
                className: 'cvat-modal-confirm-consensus-merge-job',
                onOk: () => {
                    dispatch(mergeConsensusJobsAsync(jobInstance));
                },
                okButtonProps: {
                    type: 'primary',
                    danger: true,
                },
                okText: 'Merge',
            });
        }
    }, [consensusJobsPresent, jobInstance]);

    const onDeleteJob = useCallback(() => {
        if (jobInstance.type === JobType.GROUND_TRUTH) {
            Modal.confirm({
                title: `The job ${jobInstance.id} will be deleted`,
                content: 'All related data (annotations) will be lost. Continue?',
                className: 'cvat-modal-confirm-delete-job',
                onOk: () => {
                    dispatch(deleteJobAsync(jobInstance));
                },
                okButtonProps: {
                    type: 'primary',
                    danger: true,
                },
                okText: 'Delete',
            });
        }
    }, [jobInstance]);

    return (
        <Dropdown
            destroyPopupOnHide
            trigger={['click']}
            className='job-actions-menu'
            menu={{
                selectable: false,
                className: 'cvat-job-item-menu',
                items: JobActionsItems({
                    jobID: jobInstance.id,
                    taskID: jobInstance.taskId,
                    projectID: jobInstance.projectId,
                    isMergingConsensusEnabled: mergingConsensus[makeKey(jobInstance)],
                    pluginActions,
                    onOpenBugTracker: jobInstance.bugTracker ? onOpenBugTracker : null,
                    onImportAnnotations,
                    onExportAnnotations,
                    onMergeConsensusJob: consensusJobsPresent && jobInstance.parentJobId === null ?
                        onMergeConsensusJob : null,
                    onDeleteJob: jobInstance.type === JobType.GROUND_TRUTH ? onDeleteJob : null,
                }, props),
            }}
        >
            {triggerElement}
        </Dropdown>
    );
}

export default React.memo(JobActionsComponent);
