// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) 2022-2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useCallback, useState } from 'react';
import { useHistory } from 'react-router';
import { createRoot } from 'react-dom/client';
import Modal from 'antd/lib/modal';
import Text from 'antd/lib/typography/Text';
import InputNumber from 'antd/lib/input-number';
import Checkbox from 'antd/lib/checkbox';
import Collapse from 'antd/lib/collapse';
import Dropdown from 'antd/lib/dropdown';
import Button from 'antd/lib/button';
import message from 'antd/lib/message';
import Icon from '@ant-design/icons';
import { MenuProps } from 'antd/lib/menu';

import { MainMenuIcon } from 'icons';
import CVATTooltip from 'components/common/cvat-tooltip';
import {
    Job, JobStage, JobState, getCore,
} from 'cvat-core-wrapper';
import AnnotationsActionsModalContent from '../annotations-actions/annotations-actions-modal';

const core = getCore();

interface Props {
    jobInstance: Job;
    showExportModal: (jobInstance: Job) => void;
    showImportModal: (jobInstance: Job) => void;
    removeAnnotations(startnumber: number, endnumber: number, delTrackKeyframesOnly: boolean): void;
    setForceExitAnnotationFlag(forceExit: boolean): void;
    saveAnnotations(afterSave?: () => void): void;
    updateJob(jobInstance: Job): Promise<boolean>;
}

export enum Actions {
    LOAD_JOB_ANNO = 'load_job_anno',
    EXPORT_JOB_DATASET = 'export_job_dataset',
    REMOVE_ANNOTATIONS = 'remove_annotations',
    RUN_ACTIONS = 'run_actions',
    OPEN_TASK = 'open_task',
    FINISH_JOB = 'finish_job',
    RENEW_JOB = 'renew_job',
}

function AnnotationMenuComponent(props: Props): JSX.Element {
    const {
        jobInstance,
        showExportModal,
        showImportModal,
        removeAnnotations,
        setForceExitAnnotationFlag,
        saveAnnotations,
        updateJob,
    } = props;

    const history = useHistory();
    const [jobState, setJobState] = useState(jobInstance.state);
    const { stage: jobStage, stopFrame } = jobInstance;

    const checkUnsavedChanges = useCallback((callback: () => void) => {
        if (jobInstance.annotations.hasUnsavedChanges()) {
            Modal.confirm({
                title: 'The job has unsaved annotations',
                content: 'Would you like to save changes before continue?',
                className: 'cvat-modal-content-save-job',
                okButtonProps: {
                    children: 'Save',
                },
                cancelButtonProps: {
                    children: 'No',
                },
                onOk: () => {
                    saveAnnotations(() => callback);
                },
                onCancel: () => {
                    // do not ask leave confirmation
                    setForceExitAnnotationFlag(true);
                    setTimeout(() => {
                        callback();
                    });
                },
            });
        } else {
            callback();
        }
    }, [jobInstance]);

    const exportDataset = useCallback(() => {
        showExportModal(jobInstance);
    }, [jobInstance]);

    const renewJob = useCallback(() => {
        jobInstance.state = core.enums.JobState.NEW;
        jobInstance.stage = JobStage.ANNOTATION;
        updateJob(jobInstance).then((success) => {
            if (success) {
                message.info('Job renewed', 2);
                setJobState(jobInstance.state);
            }
        });
    }, [jobInstance]);

    const finishJob = useCallback(() => {
        jobInstance.stage = JobStage.ACCEPTANCE;
        jobInstance.state = core.enums.JobState.COMPLETED;
        updateJob(jobInstance).then((success) => {
            if (success) {
                history.push(`/tasks/${jobInstance.taskId}`);
            }
        });
    }, [jobInstance]);

    const openTask = useCallback(() => {
        history.push(`/tasks/${jobInstance.taskId}`);
    }, [jobInstance.taskId]);

    const uploadAnnotations = useCallback(() => {
        showImportModal(jobInstance);
    }, [jobInstance]);

    const changeState = useCallback((state: JobState) => {
        jobInstance.state = state;
        updateJob(jobInstance).then((success) => {
            if (success) {
                message.info('Job state updated', 2);
                setJobState(jobInstance.state);
            }
        });
    }, [jobInstance]);

    const changeJobState = useCallback((state: JobState) => () => {
        Modal.confirm({
            title: 'Do you want to change current job state?',
            content: `Job state will be switched to "${state}". Continue?`,
            okText: 'Continue',
            cancelText: 'Cancel',
            className: 'cvat-modal-content-change-job-state',
            onOk: () => {
                checkUnsavedChanges(() => changeState(state));
            },
        });
    }, [changeState]);

    const computeClassName = (menuItemState: string): string => {
        if (menuItemState === jobState) return 'cvat-submenu-current-job-state-item';
        return '';
    };

    const menuItems: NonNullable<MenuProps['items']> = [];

    menuItems.push({
        key: Actions.LOAD_JOB_ANNO,
        label: 'Upload annotations',
        onClick: uploadAnnotations,
    });

    menuItems.push({
        key: Actions.EXPORT_JOB_DATASET,
        label: 'Export job dataset',
        onClick: exportDataset,
    });

    menuItems.push({
        key: Actions.REMOVE_ANNOTATIONS,
        label: 'Remove annotations',
        onClick: () => {
            let removeFrom: number | null;
            let removeUpTo: number | null;
            let removeOnlyKeyframes = false;
            Modal.confirm({
                title: 'Remove Annotations',
                content: (
                    <div>
                        <Text>You are going to remove the annotations from the client. </Text>
                        <Text>It will stay on the server till you save the job. Continue?</Text>
                        <br />
                        <br />
                        <Collapse
                            bordered={false}
                            items={[{
                                key: 1,
                                label: <Text>Select Range</Text>,
                                children: (
                                    <>
                                        <Text>From: </Text>
                                        <InputNumber
                                            min={0}
                                            max={stopFrame}
                                            onChange={(value) => {
                                                removeFrom = value;
                                            }}
                                        />
                                        <Text>  To: </Text>
                                        <InputNumber
                                            min={0}
                                            max={stopFrame}
                                            onChange={(value) => {
                                                removeUpTo = value;
                                            }}
                                        />
                                        <CVATTooltip title='Applicable only for annotations in range'>
                                            <br />
                                            <br />
                                            <Checkbox
                                                onChange={(check) => {
                                                    removeOnlyKeyframes = check.target.checked;
                                                }}
                                            >
                                                Delete only keyframes for tracks
                                            </Checkbox>
                                        </CVATTooltip>
                                    </>
                                ),
                            }]}
                        />
                    </div>
                ),
                className: 'cvat-modal-confirm-remove-annotation',
                onOk: () => {
                    removeAnnotations(removeFrom, removeUpTo, removeOnlyKeyframes);
                },
                okButtonProps: {
                    type: 'primary',
                    danger: true,
                },
                okText: 'Delete',
            });
        },
    });

    menuItems.push({
        key: Actions.RUN_ACTIONS,
        label: 'Run actions',
        onClick: () => {
            const div = window.document.createElement('div');
            window.document.body.append(div);
            const root = createRoot(div);
            root.render(
                <AnnotationsActionsModalContent
                    onClose={() => {
                        root.unmount();
                        div.remove();
                    }}
                />,
            );
        },
    });

    menuItems.push({
        key: Actions.OPEN_TASK,
        label: 'Open the task',
        onClick: openTask,
    });

    menuItems.push({
        key: 'job-state-submenu',
        popupClassName: 'cvat-annotation-menu-job-state-submenu',
        label: 'Change job state',
        children: [{
            key: `state:${JobState.NEW}`,
            label: JobState.NEW,
            className: computeClassName(JobState.NEW),
            onClick: changeJobState(JobState.NEW),
        }, {
            key: `state:${JobState.IN_PROGRESS}`,
            label: JobState.IN_PROGRESS,
            className: computeClassName(JobState.IN_PROGRESS),
            onClick: changeJobState(JobState.IN_PROGRESS),
        }, {
            key: `state:${JobState.REJECTED}`,
            label: JobState.REJECTED,
            className: computeClassName(JobState.REJECTED),
            onClick: changeJobState(JobState.REJECTED),
        }, {
            key: `state:${JobState.COMPLETED}`,
            label: JobState.COMPLETED,
            className: computeClassName(JobState.COMPLETED),
            onClick: changeJobState(JobState.COMPLETED),
        }],
    });

    if ([JobStage.ANNOTATION, JobStage.VALIDATION].includes(jobStage)) {
        menuItems.push({
            key: Actions.FINISH_JOB,
            label: 'Finish the job',
            onClick: () => {
                Modal.confirm({
                    title: 'The job stage is going to be switched',
                    content: 'Stage will be changed to "acceptance". Would you like to continue?',
                    okText: 'Continue',
                    cancelText: 'Cancel',
                    className: 'cvat-modal-content-finish-job',
                    onOk: () => {
                        checkUnsavedChanges(finishJob);
                    },
                });
            },
        });
    } else {
        menuItems.push({
            key: Actions.RENEW_JOB,
            label: 'Renew the job',
            onClick: () => {
                Modal.confirm({
                    title: 'Do you want to renew the job?',
                    content: 'Stage will be set to "in progress", state will be set to "annotation". Would you like to continue?',
                    okText: 'Continue',
                    cancelText: 'Cancel',
                    className: 'cvat-modal-content-renew-job',
                    onOk: renewJob,
                });
            },
        });
    }

    return (
        <Dropdown
            trigger={['click']}
            destroyPopupOnHide
            menu={{
                items: menuItems,
                triggerSubMenuAction: 'click',
                className: 'cvat-annotation-menu',
            }}
        >
            <Button type='link' className='cvat-annotation-header-menu-button cvat-annotation-header-button'>
                <Icon component={MainMenuIcon} />
                Menu
            </Button>
        </Dropdown>
    );
}

export default React.memo(AnnotationMenuComponent);
