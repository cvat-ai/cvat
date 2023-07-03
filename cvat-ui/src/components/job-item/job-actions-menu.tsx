// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT
import React, { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import Menu from 'antd/lib/menu';
import Modal from 'antd/lib/modal';
// eslint-disable-next-line import/no-extraneous-dependencies
import { MenuInfo } from 'rc-menu/lib/interface';
import { exportActions } from 'actions/export-actions';

import {
    Job, JobStage, JobType, getCore,
} from 'cvat-core-wrapper';
import { deleteJobAsync } from 'actions/jobs-actions';
import { importActions } from 'actions/import-actions';
import { updateJobAsync } from 'actions/tasks-actions';

const core = getCore();

interface Props {
    job: Job;
    onJobUpdate?: (job: Job) => void;
}

function JobActionsMenu(props: Props): JSX.Element {
    const { job, onJobUpdate } = props;
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
            className='cvat-actions-menu'
            onClick={(action: MenuInfo) => {
                if (action.key === 'import_job') {
                    dispatch(importActions.openImportDatasetModal(job));
                } else if (action.key === 'export_job') {
                    dispatch(exportActions.openExportDatasetModal(job));
                } else if (action.key === 'renew_job') {
                    job.state = core.enums.JobState.NEW;
                    job.stage = JobStage.ANNOTATION;
                    if (onJobUpdate) {
                        onJobUpdate(job);
                    } else {
                        dispatch(updateJobAsync(job));
                    }
                } else if (action.key === 'finish_job') {
                    job.stage = JobStage.ACCEPTANCE;
                    job.state = core.enums.JobState.COMPLETED;
                    if (onJobUpdate) {
                        onJobUpdate(job);
                    } else {
                        dispatch(updateJobAsync(job));
                    }
                }
            }}
        >
            <Menu.Item key='import_job'>Import annotations</Menu.Item>
            <Menu.Item key='export_job'>Export annotations</Menu.Item>
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
