// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT
import React from 'react';
import { useDispatch } from 'react-redux';
import { useHistory } from 'react-router';
import Menu from 'antd/lib/menu';
// eslint-disable-next-line import/no-extraneous-dependencies
import { MenuInfo } from 'rc-menu/lib/interface';
import { exportActions } from 'actions/export-actions';
import { Job } from 'cvat-core-wrapper';

interface Props {
    job: Job
}

function JobActionsMenu(props: Props): JSX.Element {
    const { job } = props;
    const history = useHistory();
    const dispatch = useDispatch();

    return (
        <Menu onClick={(action: MenuInfo) => {
            if (action.key === 'task') {
                history.push(`/tasks/${job.taskId}`);
            } else if (action.key === 'project') {
                history.push(`/projects/${job.projectId}`);
            } else if (action.key === 'bug_tracker') {
                if (job.bugTracker) window.open(job.bugTracker, '_blank', 'noopener noreferrer');
            }
        }}
        >
            <Menu.Item key='task' disabled={job.taskId === null}>Go to the task</Menu.Item>
            <Menu.Item key='project' disabled={job.projectId === null}>Go to the project</Menu.Item>
            <Menu.Item key='bug_tracker' disabled={!job.bugTracker}>Go to the bug tracker</Menu.Item>
            <Menu.Item key='export_job' onClick={() => dispatch(exportActions.openExportDatasetModal(job))}>Export job</Menu.Item>
        </Menu>
    );
}

export default React.memo(JobActionsMenu);
