// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useHistory } from 'react-router';
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
    const history = useHistory();

    const pluginActions = usePlugins((state: CombinedState) => state.plugins.components.jobActions.items, props);
    const mergingConsensus = useSelector((state: CombinedState) => state.consensus.actions.merging);

    const onOpenTaskPage = useCallback(() => {
        history.push(`/tasks/${jobInstance.taskId}`);
    }, [jobInstance.taskId]);

    const onOpenProjectPage = jobInstance.projectId ? useCallback(() => {
        history.push(`/projects/${jobInstance.projectId}`);
    }, []) : null;

    const onOpenBugTracker = jobInstance.bugTracker ? useCallback(() => {
        window.open(jobInstance.bugTracker as string, '_blank', 'noopener noreferrer');
    }, []) : null;

    const onImportAnnotations = useCallback(() => {
        dispatch(importActions.openImportDatasetModal(jobInstance));
    }, []);

    const onExportAnnotations = useCallback(() => {
        dispatch(exportActions.openExportDatasetModal(jobInstance));
    }, []);

    const onMergeConsensusJob = consensusJobsPresent && jobInstance.parentJobId === null ? useCallback(() => {
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
    }, []) : null;

    const onDeleteJob = jobInstance.type === JobType.GROUND_TRUTH ? useCallback(() => {
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
    }, []) : null;

    return (
        <Dropdown
            destroyPopupOnHide
            trigger={['click']}
            className='job-actions-menu'
            menu={{
                selectable: false,
                className: 'cvat-job-item-menu',
                items: JobActionsItems({
                    isMergingConsensusEnabled: mergingConsensus[makeKey(jobInstance)],
                    pluginActions,
                    onOpenTaskPage,
                    onOpenProjectPage,
                    onOpenBugTracker,
                    onImportAnnotations,
                    onExportAnnotations,
                    onMergeConsensusJob,
                    onDeleteJob,
                }, { ...props, history }),
            }}
        >
            {triggerElement}
        </Dropdown>
    );
}

export default React.memo(JobActionsComponent);
