// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) 2022-2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { withRouter, RouteComponentProps } from 'react-router';
import { connect } from 'react-redux';
import mixpanel from 'mixpanel-browser';
// eslint-disable-next-line import/no-extraneous-dependencies
import { MenuInfo } from 'rc-menu/lib/interface';

import { CombinedState, JobsQuery } from 'reducers';
import AnnotationMenuComponent, { Actions } from 'components/annotation-page/top-bar/annotation-menu';
import { updateJobAsync } from 'actions/jobs-actions';
import {
    saveAnnotationsAsync,
    setForceExitAnnotationFlag as setForceExitAnnotationFlagAction,
    removeAnnotationsAsync as removeAnnotationsAsyncAction,
} from 'actions/annotation-actions';
import { exportActions } from 'actions/export-actions';
import { importActions } from 'actions/import-actions';
import {
    getCore, Job, JobStage, JobState,
} from 'cvat-core-wrapper';
import { message } from 'antd';
import { filterNull } from '../../../utils/filter-null';

const core = getCore();

interface StateToProps {
    jobInstance: Job;
    stopFrame: number;
}

interface DispatchToProps {
    showExportModal: (jobInstance: Job) => void;
    showImportModal: (jobInstance: Job) => void;
    removeAnnotations(startnumber: number, endnumber: number, delTrackKeyframesOnly: boolean): void;
    setForceExitAnnotationFlag(forceExit: boolean): void;
    saveAnnotations(jobInstance: Job, afterSave?: () => void): void;
    updateJob(jobInstance: Job): Promise<boolean>;
}

function mapStateToProps(state: CombinedState): StateToProps {
    const {
        annotation: {
            job: {
                instance: jobInstance,
                instance: { stopFrame },
            },
        },
    } = state;

    return {
        jobInstance,
        stopFrame,
    };
}

function mapDispatchToProps(dispatch: any): DispatchToProps {
    return {
        showExportModal(jobInstance: Job): void {
            dispatch(exportActions.openExportDatasetModal(jobInstance));
        },
        showImportModal(jobInstance: Job): void {
            dispatch(importActions.openImportDatasetModal(jobInstance));
        },
        removeAnnotations(startnumber: number, endnumber: number, delTrackKeyframesOnly:boolean) {
            dispatch(removeAnnotationsAsyncAction(startnumber, endnumber, delTrackKeyframesOnly));
        },
        setForceExitAnnotationFlag(forceExit: boolean): void {
            dispatch(setForceExitAnnotationFlagAction(forceExit));
        },
        saveAnnotations(jobInstance: Job, afterSave?: () => void): void {
            dispatch(saveAnnotationsAsync(jobInstance, afterSave));
        },
        updateJob(jobInstance: Job): Promise<boolean> {
            return dispatch(updateJobAsync(jobInstance));
        },
    };
}

type Props = StateToProps & DispatchToProps & RouteComponentProps;

function AnnotationMenuContainer(props: Props): JSX.Element {
    const {
        jobInstance,
        stopFrame,
        history,
        showExportModal,
        showImportModal,
        removeAnnotations,
        setForceExitAnnotationFlag,
        saveAnnotations,
        updateJob,
    } = props;

    function nextJobsQuery(assignee: string, page: number): JobsQuery {
        return {
            page,
            sort: null,
            search: null,
            filter: JSON.stringify({
                and: [
                    {
                        '!': {
                            or: [
                                { '==': [{ var: 'state' }, 'completed'] },
                                { '==': [{ var: 'state' }, 'rejected'] },
                                { '==': [{ var: 'stage' }, 'acceptance'] },
                            ],
                        },
                    },
                    { '==': [{ var: 'assignee' }, assignee] },
                ],
            }),
        };
    }

    function makeUserFilter(assignee: string): string {
        return JSON.stringify({ and: [{ '==': [{ var: 'assignee' }, assignee] }] });
    }

    const loadNextJob = async (): Promise<void> => {
        const assignee = jobInstance!.assignee!.username;
        const currentJobsQuery = nextJobsQuery(assignee, 1);
        try {
            const currentPageJobs: any[] = await core.jobs.get(filterNull(currentJobsQuery));
            if (currentPageJobs && currentPageJobs.length > 0) {
                const nextPageJobsQuery = nextJobsQuery(assignee, 2);
                try {
                    const nextPageJobs = await core.jobs.get(filterNull(nextPageJobsQuery));
                    if (nextPageJobs && nextPageJobs.length > 0) {
                        const currentJobPosition = currentPageJobs.findIndex((job) => job.id === jobInstance.id);
                        const nextJob = nextPageJobs[Math.max(0, currentJobPosition)];
                        history.push(`/tasks/${nextJob.taskId}/jobs/${nextJob.id}`);
                    }
                } catch (error) {
                    console.log(`Could not find next job page: ${error}. Returning to main page.`);
                }
            }
            const userFilter = makeUserFilter(assignee);
            history.push(`/jobs?filter=${userFilter}`);
        } catch (error) {
            console.log(`Could not find current job page: ${error}. Returning to main page.`);
        }
    };

    const onClickMenu = async (params: MenuInfo): Promise<void> => {
        const [action] = params.keyPath;
        if (action === Actions.EXPORT_JOB_DATASET) {
            showExportModal(jobInstance);
        } else if (action === Actions.RENEW_JOB) {
            jobInstance.state = core.enums.JobState.NEW;
            jobInstance.stage = JobStage.ANNOTATION;
            updateJob(jobInstance).then((success) => {
                if (success) {
                    mixpanel.track('Renewed job', { jobId: jobInstance.id });
                    message.info('Job renewed', 2);
                }
            });
        } else if (action === Actions.FINISH_JOB) {
            jobInstance.stage = JobStage.ACCEPTANCE;
            jobInstance.state = core.enums.JobState.COMPLETED;
            updateJob(jobInstance).then((success) => {
                if (success) {
                    mixpanel.track('Finished Job', { jobId: jobInstance.id });
                    history.push(`/tasks/${jobInstance.taskId}`);
                }
            });
            updateJob(jobInstance);
            await loadNextJob();
        } else if (action === Actions.OPEN_TASK) {
            history.push(`/tasks/${jobInstance.taskId}`);
            mixpanel.track('Opened task for job', { jobId: jobInstance.id, taskId: jobInstance.taskId });
        } else if (action.startsWith('state:')) {
            [, jobInstance.state] = action.split(':') as [string, JobState];
            updateJob(jobInstance).then((success) => {
                if (success) {
                    mixpanel.track('Updated job state', { jobId: jobInstance.id, newState: jobInstance.state });
                    message.info('Job state updated', 2);
                    if (['rejected', 'completed'].includes(jobInstance.state)) {
                        loadNextJob();
                    } else {
                        window.location.reload();
                    }
                }
            });
        } else if (action === Actions.LOAD_JOB_ANNO) {
            showImportModal(jobInstance);
        }
    };

    return (
        <AnnotationMenuComponent
            taskMode={jobInstance.mode}
            onClickMenu={onClickMenu}
            removeAnnotations={removeAnnotations}
            setForceExitAnnotationFlag={setForceExitAnnotationFlag}
            saveAnnotations={saveAnnotations}
            jobInstance={jobInstance}
            stopFrame={stopFrame}
        />
    );
}

export default withRouter(connect(mapStateToProps, mapDispatchToProps)(AnnotationMenuContainer));
