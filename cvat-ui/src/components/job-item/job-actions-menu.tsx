// Copyright (C) 2023-2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { useHistory } from 'react-router';
import Modal from 'antd/lib/modal';
import { exportActions } from 'actions/export-actions';

import {
    Job, JobStage, JobType, getCore,
} from 'cvat-core-wrapper';
import { deleteJobAsync } from 'actions/jobs-actions';
import { importActions } from 'actions/import-actions';
import Menu, { MenuInfo } from 'components/dropdown-menu';

const core = getCore();

interface Props {
    job: Job;
    onJobUpdate: (job: Job) => void;
}

function JobActionsMenu(props: Props): JSX.Element {
    const { job, onJobUpdate } = props;
    const history = useHistory();
    const dispatch = useDispatch();

    const onDelete = useCallback(() => {
        Modal.confirm({
            title: `The job ${job.id} will be deleted`,
            content: 'All related data (annotations) will be lost. Continue?',
            className: 'cvat-modal-confirm-delete-job',
            onOk: () => {
                dispatch(deleteJobAsync(job));
            },
            okButtonProps: {
                type: 'primary',
                danger: true,
            },
            okText: 'Delete',
        });
    }, [job]);

    return (
        <Menu
            className='cvat-job-item-menu'
            onClick={(action: MenuInfo) => {
                if (action.key === 'task') {
                    history.push(`/tasks/${job.taskId}`);
                } else if (action.key === 'project') {
                    history.push(`/projects/${job.projectId}`);
                } else if (action.key === 'bug_tracker') {
                    if (job.bugTracker) {
                        window.open(job.bugTracker, '_blank', 'noopener noreferrer');
                    }
                } else if (action.key === 'import_job') {
                    dispatch(importActions.openImportDatasetModal(job));
                } else if (action.key === 'export_job') {
                    dispatch(exportActions.openExportDatasetModal(job));
                } else if (action.key === 'view_analytics') {
                    history.push(`/tasks/${job.taskId}/jobs/${job.id}/analytics`);
                } else if (action.key === 'renew_job') {
                    job.state = core.enums.JobState.NEW;
                    job.stage = JobStage.ANNOTATION;
                    onJobUpdate(job);
                } else if (action.key === 'finish_job') {
                    job.stage = JobStage.ACCEPTANCE;
                    job.state = core.enums.JobState.COMPLETED;
                    onJobUpdate(job);
                }
            }}
        >
            <Menu.Item key='task' disabled={job.taskId === null}>Go to the task</Menu.Item>
            <Menu.Item key='project' disabled={job.projectId === null}>Go to the project</Menu.Item>
            <Menu.Item key='bug_tracker' disabled={!job.bugTracker}>Go to the bug tracker</Menu.Item>
            <Menu.Item key='import_job'>Import annotations</Menu.Item>
            <Menu.Item key='export_job'>Export annotations</Menu.Item>
            <Menu.Item key='view_analytics'>View analytics</Menu.Item>
            {[JobStage.ANNOTATION, JobStage.VALIDATION].includes(job.stage) ?
                <Menu.Item key='finish_job'>Finish the job</Menu.Item> : null}
            {job.stage === JobStage.ACCEPTANCE ?
                <Menu.Item key='renew_job'>Renew the job</Menu.Item> : null}
            <Menu.Divider />
            <Menu.Item
                key='delete'
                disabled={job.type !== JobType.GROUND_TRUTH}
                onClick={() => onDelete()}
            >
                Delete
            </Menu.Item>
        </Menu>
    );
}

export default React.memo(JobActionsMenu);
