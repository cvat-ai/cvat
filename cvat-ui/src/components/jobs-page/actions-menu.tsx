// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Dropdown from 'antd/lib/dropdown';
import Modal from 'antd/lib/modal';

import {
    Job, JobStage, JobState, JobType, User,
} from 'cvat-core-wrapper';
import { useDropdownEditField, usePlugins } from 'utils/hooks';
import { CombinedState } from 'reducers';
import { exportActions } from 'actions/export-actions';
import { importActions } from 'actions/import-actions';
import { mergeConsensusJobsAsync } from 'actions/consensus-actions';
import { deleteJobAsync, updateJobAsync } from 'actions/jobs-actions';

import UserSelector from 'components/task-page/user-selector';
import { JobStageSelector, JobStateSelector } from 'components/job-item/job-selectors';
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

    const {
        dropdownOpen,
        editField,
        startEditField,
        stopEditField,
        onOpenChange,
        onMenuClick,
    } = useDropdownEditField();

    const onOpenBugTracker = useCallback(() => {
        if (jobInstance.bugTracker) {
            window.open(jobInstance.bugTracker, '_blank', 'noopener noreferrer');
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

    const onUpdateJobField = useCallback((
        fields: Partial<{ assignee: User | null; state: JobState; stage: JobStage; }>,
    ) => {
        dispatch(updateJobAsync(jobInstance, fields)).then(stopEditField);
    }, [jobInstance]);

    let menuItems;
    if (editField) {
        const fieldSelectors: Record<string, JSX.Element> = {
            assignee: (
                <UserSelector
                    value={jobInstance.assignee}
                    onSelect={(value: User | null): void => {
                        if (jobInstance.assignee?.id === value?.id) return;
                        onUpdateJobField({ assignee: value });
                    }}
                />
            ),
            state: (
                <JobStateSelector
                    value={jobInstance.state}
                    onSelect={(value) => onUpdateJobField({ state: value })}
                />
            ),
            stage: (
                <JobStageSelector
                    value={jobInstance.stage}
                    onSelect={(value) => onUpdateJobField({ stage: value })}
                />
            ),
        };
        menuItems = [{
            key: `${editField}-selector`,
            label: fieldSelectors[editField],
        }];
    } else {
        menuItems = JobActionsItems({
            startEditField,
            jobId: jobInstance.id,
            taskId: jobInstance.taskId,
            projectId: jobInstance.projectId,
            pluginActions,
            isMergingConsensusEnabled: mergingConsensus[makeKey(jobInstance)],
            onOpenBugTracker: jobInstance.bugTracker ? onOpenBugTracker : null,
            onImportAnnotations,
            onExportAnnotations,
            onMergeConsensusJob: consensusJobsPresent && jobInstance.parentJobId === null ? onMergeConsensusJob : null,
            onDeleteJob: jobInstance.type === JobType.GROUND_TRUTH ? onDeleteJob : null,
        }, props);
    }

    return (
        <Dropdown
            destroyPopupOnHide
            trigger={['click']}
            open={dropdownOpen}
            onOpenChange={onOpenChange}
            className='job-actions-menu'
            menu={{
                selectable: false,
                className: 'cvat-job-item-menu',
                items: menuItems,
                onClick: onMenuClick,
            }}
        >
            {triggerElement}
        </Dropdown>
    );
}

export default React.memo(JobActionsComponent);
