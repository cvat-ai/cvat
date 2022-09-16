// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) 2022 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { withRouter, RouteComponentProps } from 'react-router';

import Menu from 'antd/lib/menu';
import Modal from 'antd/lib/modal';
import Text from 'antd/lib/typography/Text';
import InputNumber from 'antd/lib/input-number';
import Checkbox from 'antd/lib/checkbox';
import Collapse from 'antd/lib/collapse';

// eslint-disable-next-line import/no-extraneous-dependencies
import { MenuInfo } from 'rc-menu/lib/interface';
import CVATTooltip from 'components/common/cvat-tooltip';
import { getCore } from 'cvat-core-wrapper';
import { JobStage } from 'reducers';

const core = getCore();

interface Props {
    taskMode: string;
    jobInstance: any;
    onClickMenu(params: MenuInfo): void;
    stopFrame: number;
    removeAnnotations(startnumber: number, endnumber: number, delTrackKeyframesOnly:boolean): void;
    setForceExitAnnotationFlag(forceExit: boolean): void;
    saveAnnotations(jobInstance: any, afterSave?: () => void): void;
}

export enum Actions {
    LOAD_JOB_ANNO = 'load_job_anno',
    EXPORT_JOB_DATASET = 'export_job_dataset',
    REMOVE_ANNO = 'remove_anno',
    OPEN_TASK = 'open_task',
    FINISH_JOB = 'finish_job',
    RENEW_JOB = 'renew_job',
}

function AnnotationMenuComponent(props: Props & RouteComponentProps): JSX.Element {
    const {
        jobInstance,
        stopFrame,
        history,
        onClickMenu,
        removeAnnotations,
        setForceExitAnnotationFlag,
        saveAnnotations,
    } = props;

    const jobStage = jobInstance.stage;
    const jobState = jobInstance.state;
    const taskID = jobInstance.taskId;
    const { JobState } = core.enums;

    function onClickMenuWrapper(params: MenuInfo): void {
        function checkUnsavedChanges(_params: MenuInfo): void {
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
                        saveAnnotations(jobInstance, () => onClickMenu(_params));
                    },
                    onCancel: () => {
                        // do not ask leave confirmation
                        setForceExitAnnotationFlag(true);
                        setTimeout(() => {
                            onClickMenu(_params);
                        });
                    },
                });
            } else {
                onClickMenu(_params);
            }
        }

        if (params.key === Actions.REMOVE_ANNO) {
            let removeFrom: number;
            let removeUpTo: number;
            let removeOnlyKeyframes = false;
            const { Panel } = Collapse;
            Modal.confirm({
                title: 'Remove Annotations',
                content: (
                    <div>
                        <Text>You are going to remove the annotations from the client. </Text>
                        <Text>It will stay on the server till you save the job. Continue?</Text>
                        <br />
                        <br />
                        <Collapse bordered={false}>
                            <Panel header={<Text>Select Range</Text>} key={1}>
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
                                    onChange={(value) => { removeUpTo = value; }}
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
                            </Panel>
                        </Collapse>
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
        } else if (params.key.startsWith('state:')) {
            Modal.confirm({
                title: 'Do you want to change current job state?',
                content: `Job state will be switched to "${params.key.split(':')[1]}". Continue?`,
                okText: 'Continue',
                cancelText: 'Cancel',
                className: 'cvat-modal-content-change-job-state',
                onOk: () => {
                    checkUnsavedChanges(params);
                },
            });
        } else if (params.key === Actions.FINISH_JOB) {
            Modal.confirm({
                title: 'The job stage is going to be switched',
                content: 'Stage will be changed to "acceptance". Would you like to continue?',
                okText: 'Continue',
                cancelText: 'Cancel',
                className: 'cvat-modal-content-finish-job',
                onOk: () => {
                    checkUnsavedChanges(params);
                },
            });
        } else if (params.key === Actions.RENEW_JOB) {
            Modal.confirm({
                title: 'Do you want to renew the job?',
                content: 'Stage will be set to "in progress", state will be set to "annotation". Would you like to continue?',
                okText: 'Continue',
                cancelText: 'Cancel',
                className: 'cvat-modal-content-renew-job',
                onOk: () => {
                    onClickMenu(params);
                },
            });
        } else {
            onClickMenu(params);
        }
    }

    const computeClassName = (menuItemState: string): string => {
        if (menuItemState === jobState) return 'cvat-submenu-current-job-state-item';
        return '';
    };

    return (
        <Menu onClick={(params: MenuInfo) => onClickMenuWrapper(params)} className='cvat-annotation-menu' selectable={false}>
            <Menu.Item key={Actions.LOAD_JOB_ANNO}>Upload annotations</Menu.Item>
            <Menu.Item key={Actions.EXPORT_JOB_DATASET}>Export job dataset</Menu.Item>
            <Menu.Item key={Actions.REMOVE_ANNO}>Remove annotations</Menu.Item>
            <Menu.Item key={Actions.OPEN_TASK}>
                <a
                    href={`/tasks/${taskID}`}
                    onClick={(e: React.MouseEvent) => {
                        e.preventDefault();
                        history.push(`/tasks/${taskID}`);
                        return false;
                    }}
                >
                    Open the task
                </a>
            </Menu.Item>
            <Menu.SubMenu popupClassName='cvat-annotation-menu-job-state-submenu' key='job-state-submenu' title='Change job state'>
                <Menu.Item key={`state:${JobState.NEW}`}>
                    <Text className={computeClassName(JobState.NEW)}>{JobState.NEW}</Text>
                </Menu.Item>
                <Menu.Item key={`state:${JobState.IN_PROGRESS}`}>
                    <Text className={computeClassName(JobState.IN_PROGRESS)}>{JobState.IN_PROGRESS}</Text>
                </Menu.Item>
                <Menu.Item key={`state:${JobState.REJECTED}`}>
                    <Text className={computeClassName(JobState.REJECTED)}>{JobState.REJECTED}</Text>
                </Menu.Item>
                <Menu.Item key={`state:${JobState.COMPLETED}`}>
                    <Text className={computeClassName(JobState.COMPLETED)}>{JobState.COMPLETED}</Text>
                </Menu.Item>
            </Menu.SubMenu>
            {[JobStage.ANNOTATION, JobStage.REVIEW].includes(jobStage) ?
                <Menu.Item key={Actions.FINISH_JOB}>Finish the job</Menu.Item> : null}
            {jobStage === JobStage.ACCEPTANCE ?
                <Menu.Item key={Actions.RENEW_JOB}>Renew the job</Menu.Item> : null}
        </Menu>
    );
}

export default withRouter(AnnotationMenuComponent);
