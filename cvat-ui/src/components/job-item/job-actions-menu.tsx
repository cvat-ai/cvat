// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { useHistory } from 'react-router';
import Modal from 'antd/lib/modal';

import { exportActions } from 'actions/export-actions';
import { deleteJobAsync } from 'actions/jobs-actions';
import { importActions } from 'actions/import-actions';
import { Job, JobType } from 'cvat-core-wrapper';
import Menu, { MenuInfo } from 'components/dropdown-menu';

interface Props {
    job: Job;
}

export enum Actions {
    TASK = 'task',
    PROJECT = 'project',
    BUG_TRACKER = 'bug_tracker',
    IMPORT_JOB = 'import_job',
    EXPORT_JOB = 'export_job',
    VIEW_ANALYTICS = 'view_analytics',
    DELETE = 'delete',
}

function JobActionsMenu(props: Props): JSX.Element {
    const { job } = props;

    const dispatch = useDispatch();
    const history = useHistory();

    const onClickMenu = useCallback(
        (action: MenuInfo) => {
            if (action.key === Actions.TASK) {
                history.push(`/tasks/${job.taskId}`);
            } else if (action.key === Actions.PROJECT) {
                history.push(`/projects/${job.projectId}`);
            } else if (action.key === Actions.BUG_TRACKER) {
                if (job.bugTracker) {
                    window.open(job.bugTracker, '_blank', 'noopener noreferrer');
                }
            } else if (action.key === Actions.IMPORT_JOB) {
                dispatch(importActions.openImportDatasetModal(job));
            } else if (action.key === Actions.EXPORT_JOB) {
                dispatch(exportActions.openExportDatasetModal(job));
            } else if (action.key === Actions.VIEW_ANALYTICS) {
                history.push(`/tasks/${job.taskId}/jobs/${job.id}/analytics`);
            } else if (action.key === Actions.DELETE) {
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
            }
        },
        [job],
    );

    return (
        <Menu
            className='cvat-job-item-menu'
            onClick={onClickMenu}
        >
            <Menu.Item key={Actions.TASK} disabled={job.taskId === null}>Go to the task</Menu.Item>
            <Menu.Item key={Actions.PROJECT} disabled={job.projectId === null}>Go to the project</Menu.Item>
            <Menu.Item key={Actions.BUG_TRACKER} disabled={!job.bugTracker}>Go to the bug tracker</Menu.Item>
            <Menu.Item key={Actions.IMPORT_JOB}>Import annotations</Menu.Item>
            <Menu.Item key={Actions.EXPORT_JOB}>Export annotations</Menu.Item>
            <Menu.Item key={Actions.VIEW_ANALYTICS}>View analytics</Menu.Item>
            <Menu.Divider />
            <Menu.Item
                key={Actions.DELETE}
                disabled={job.type !== JobType.GROUND_TRUTH}
            >
                Delete
            </Menu.Item>
        </Menu>
    );
}

export default React.memo(JobActionsMenu);
