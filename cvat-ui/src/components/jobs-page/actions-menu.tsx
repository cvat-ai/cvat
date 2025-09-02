// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useCallback } from 'react';
import { shallowEqual, useDispatch, useSelector } from 'react-redux';
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
import { makeBulkOperationAsync } from 'actions/bulk-actions';

import UserSelector from 'components/task-page/user-selector';
import { JobStageSelector, JobStateSelector } from 'components/job-item/job-selectors';
import { makeKey } from 'reducers/consensus-reducer';
import JobActionsItems from './actions-menu-items';

interface Props {
    jobInstance: Job;
    consensusJobsPresent: boolean;
    triggerElement: JSX.Element;
    dropdownTrigger?: ('click' | 'hover' | 'contextMenu')[];
}

function JobActionsComponent(
    props: Readonly<Props>,
): JSX.Element {
    const {
        jobInstance,
        triggerElement,
        consensusJobsPresent,
        dropdownTrigger,
    } = props;
    const dispatch = useDispatch();

    const pluginActions = usePlugins((state: CombinedState) => state.plugins.components.jobActions.items, props);
    const {
        mergingConsensus,
        selectedIds,
        allJobs,
    } = useSelector((state: CombinedState) => ({
        mergingConsensus: state.consensus.actions.merging,
        selectedIds: state.jobs.selected,
        allJobs: state.jobs.current,
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
        const jobsToDelete = allJobs.filter((job) => selectedIds.includes(job.id));
        const isBulk = jobsToDelete.length > 1;
        Modal.confirm({
            title: isBulk ?
                `Delete ${jobsToDelete.length} selected jobs` :
                `The job ${jobInstance.id} will be deleted`,
            content: isBulk ?
                'All related data (annotations) for all selected jobs will be lost. Continue?' :
                'All related data (annotations) will be lost. Continue?',
            className: 'cvat-modal-confirm-delete-job',
            onOk: () => {
                setTimeout(() => {
                    dispatch(makeBulkOperationAsync(
                        jobsToDelete.length ? jobsToDelete : [jobInstance],
                        async (job) => {
                            if (job.type === JobType.GROUND_TRUTH) {
                                await dispatch(deleteJobAsync(job));
                            }
                        },
                        (job, idx, total) => `Deleting job #${job.id} (${idx + 1}/${total})`,
                    ));
                }, 0);
            },
            okButtonProps: {
                type: 'primary',
                danger: true,
            },
            okText: isBulk ? 'Delete selected' : 'Delete',
        });
    }, [jobInstance, allJobs, selectedIds, dispatch]);

    const onUpdateJobField = useCallback((
        fields: Partial<{ assignee: User | null; state: JobState; stage: JobStage; }>,
    ) => {
        const jobsToUpdate = allJobs.filter((job) => selectedIds.includes(job.id));
        const jobs = jobsToUpdate.length ? jobsToUpdate : [jobInstance];

        const jobsNeedingUpdate = jobs.filter((job) => {
            if (fields.assignee !== undefined) {
                return job.assignee?.id !== fields.assignee?.id;
            }
            if (fields.state !== undefined) {
                return job.state !== fields.state;
            }
            if (fields.stage !== undefined) {
                return job.stage !== fields.stage;
            }
            return true;
        });

        stopEditField();
        if (jobsNeedingUpdate.length === 0) {
            return;
        }

        dispatch(makeBulkOperationAsync(
            jobsNeedingUpdate,
            async (job) => {
                await dispatch(updateJobAsync(job, fields));
            },
            (job, idx, total) => `Updating job #${job.id} (${idx + 1}/${total})`,
        ));
    }, [jobInstance, allJobs, selectedIds, dispatch, stopEditField]);

    let menuItems;
    if (editField) {
        const fieldSelectors: Record<string, JSX.Element> = {
            assignee: (
                <UserSelector
                    value={isBulkMode ? null : jobInstance.assignee}
                    onSelect={(value: User | null): void => {
                        onUpdateJobField({ assignee: value });
                    }}
                />
            ),
            state: (
                <JobStateSelector
                    value={isBulkMode ? null : jobInstance.state}
                    onSelect={(value) => onUpdateJobField({ state: value })}
                />
            ),
            stage: (
                <JobStageSelector
                    value={isBulkMode ? null : jobInstance.stage}
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
            selectedIds,
        }, props);
    }

    return (
        <Dropdown
            destroyPopupOnHide
            trigger={dropdownTrigger || ['click']}
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
