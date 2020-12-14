// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import Menu from 'antd/lib/menu';
import Modal from 'antd/lib/modal';
// eslint-disable-next-line import/no-extraneous-dependencies
import { MenuInfo } from 'rc-menu/lib/interface';

import DumpSubmenu from 'components/actions-menu/dump-submenu';
import LoadSubmenu from 'components/actions-menu/load-submenu';
import ExportSubmenu from 'components/actions-menu/export-submenu';

interface Props {
    taskMode: string;
    loaders: any[];
    dumpers: any[];
    loadActivity: string | null;
    dumpActivities: string[] | null;
    exportActivities: string[] | null;
    isReviewer: boolean;
    jobInstance: any;
    onClickMenu(params: MenuInfo, file?: File): void;
    setForceExitAnnotationFlag(forceExit: boolean): void;
    saveAnnotations(jobInstance: any, afterSave?: () => void): void;
}

export enum Actions {
    DUMP_TASK_ANNO = 'dump_task_anno',
    LOAD_JOB_ANNO = 'load_job_anno',
    EXPORT_TASK_DATASET = 'export_task_dataset',
    REMOVE_ANNO = 'remove_anno',
    OPEN_TASK = 'open_task',
    REQUEST_REVIEW = 'request_review',
    SUBMIT_REVIEW = 'submit_review',
    FINISH_JOB = 'finish_job',
    RENEW_JOB = 'renew_job',
}

export default function AnnotationMenuComponent(props: Props): JSX.Element {
    const {
        taskMode,
        loaders,
        dumpers,
        loadActivity,
        dumpActivities,
        exportActivities,
        isReviewer,
        jobInstance,
        onClickMenu,
        setForceExitAnnotationFlag,
        saveAnnotations,
    } = props;

    const jobStatus = jobInstance.status;
    const taskID = jobInstance.task.id;

    let latestParams: MenuInfo | null = null;
    function onClickMenuWrapper(params: MenuInfo | null, file?: File): void {
        const copyParams = params || latestParams;
        if (!copyParams) {
            return;
        }
        latestParams = params;

        function checkUnsavedChanges(_copyParams: MenuInfo): void {
            if (jobInstance.annotations.hasUnsavedChanges()) {
                Modal.confirm({
                    title: 'The job has unsaved annotations',
                    content: 'Would you like to save changes before continue?',
                    okButtonProps: {
                        children: 'Save',
                    },
                    cancelButtonProps: {
                        children: 'No',
                    },
                    onOk: () => {
                        saveAnnotations(jobInstance, () => onClickMenu(_copyParams));
                    },
                    onCancel: () => {
                        // do not ask leave confirmation
                        setForceExitAnnotationFlag(true);
                        setTimeout(() => {
                            onClickMenu(_copyParams);
                        });
                    },
                });
            } else {
                onClickMenu(_copyParams);
            }
        }

        if (copyParams.keyPath.length === 2) {
            const [, action] = copyParams.keyPath;
            if (action === Actions.LOAD_JOB_ANNO) {
                if (file) {
                    Modal.confirm({
                        title: 'Current annotation will be lost',
                        content: 'You are going to upload new annotations to this job. Continue?',
                        onOk: () => {
                            onClickMenu(copyParams, file);
                        },
                        okButtonProps: {
                            type: 'primary',
                            danger: true,
                        },
                        okText: 'Update',
                    });
                }
            } else {
                onClickMenu(copyParams);
            }
        } else if (copyParams.key === Actions.REMOVE_ANNO) {
            Modal.confirm({
                title: 'All the annotations will be removed',
                content:
                    'You are going to remove all the annotations from the client. ' +
                    'It will stay on the server till you save the job. Continue?',
                onOk: () => {
                    onClickMenu(copyParams);
                },
                okButtonProps: {
                    type: 'primary',
                    danger: true,
                },
                okText: 'Delete',
            });
        } else if ([Actions.REQUEST_REVIEW].includes(copyParams.key as Actions)) {
            checkUnsavedChanges(copyParams);
        } else if (copyParams.key === Actions.FINISH_JOB) {
            Modal.confirm({
                title: 'The job status is going to be switched',
                content: 'Status will be changed to "completed". Would you like to continue?',
                okText: 'Continue',
                cancelText: 'Cancel',
                onOk: () => {
                    checkUnsavedChanges(copyParams);
                },
            });
        } else if (copyParams.key === Actions.RENEW_JOB) {
            Modal.confirm({
                title: 'The job status is going to be switched',
                content: 'Status will be changed to "annotations". Would you like to continue?',
                okText: 'Continue',
                cancelText: 'Cancel',
                onOk: () => {
                    onClickMenu(copyParams);
                },
            });
        } else {
            onClickMenu(copyParams);
        }
    }

    return (
        <Menu onClick={onClickMenuWrapper} className='cvat-annotation-menu' selectable={false}>
            {DumpSubmenu({
                taskMode,
                dumpers,
                dumpActivities,
                menuKey: Actions.DUMP_TASK_ANNO,
            })}
            {LoadSubmenu({
                loaders,
                loadActivity,
                onFileUpload: (file: File): void => {
                    onClickMenuWrapper(null, file);
                },
                menuKey: Actions.LOAD_JOB_ANNO,
            })}
            {ExportSubmenu({
                exporters: dumpers,
                exportActivities,
                menuKey: Actions.EXPORT_TASK_DATASET,
            })}

            <Menu.Item key={Actions.REMOVE_ANNO}>Remove annotations</Menu.Item>
            <Menu.Item key={Actions.OPEN_TASK}>
                <a href={`/tasks/${taskID}`} onClick={(e: React.MouseEvent) => e.preventDefault()}>
                    Open the task
                </a>
            </Menu.Item>
            {jobStatus === 'annotation' && <Menu.Item key={Actions.REQUEST_REVIEW}>Request a review</Menu.Item>}
            {jobStatus === 'annotation' && <Menu.Item key={Actions.FINISH_JOB}>Finish the job</Menu.Item>}
            {jobStatus === 'validation' && isReviewer && (
                <Menu.Item key={Actions.SUBMIT_REVIEW}>Submit the review</Menu.Item>
            )}
            {jobStatus === 'completed' && <Menu.Item key={Actions.RENEW_JOB}>Renew the job</Menu.Item>}
        </Menu>
    );
}
