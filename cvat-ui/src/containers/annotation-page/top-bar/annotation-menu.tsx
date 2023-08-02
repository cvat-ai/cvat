// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) 2022 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { withRouter, RouteComponentProps } from 'react-router';
import { connect } from 'react-redux';
// eslint-disable-next-line import/no-extraneous-dependencies
import { MenuInfo } from 'rc-menu/lib/interface';

import { CombinedState, JobsQuery, JobsState, JobStage, TasksQuery, TasksState } from 'reducers';
import AnnotationMenuComponent, { Actions } from 'components/annotation-page/top-bar/annotation-menu';
import { updateJobAsync } from 'actions/tasks-actions';
import {
    saveAnnotationsAsync,
    setForceExitAnnotationFlag as setForceExitAnnotationFlagAction,
    removeAnnotationsAsync as removeAnnotationsAsyncAction,
} from 'actions/annotation-actions';
import { exportActions } from 'actions/export-actions';
import { importActions } from 'actions/import-actions';
import { getCore } from 'cvat-core-wrapper';
import { getJobsAsync } from 'actions/jobs-actions';
import { filterNull } from '../../../utils/filter-null';

const core = getCore();

interface StateToProps {
    jobInstance: any;
    stopFrame: number;
    currentJobs: any[];
}

interface DispatchToProps {
    showExportModal: (jobInstance: any) => void;
    showImportModal: (jobInstance: any) => void;
    removeAnnotations(startnumber: number, endnumber: number, delTrackKeyframesOnly: boolean): void;
    setForceExitAnnotationFlag(forceExit: boolean): void;
    saveAnnotations(jobInstance: any, afterSave?: () => void): void;
    updateJob(jobInstance: any): void;
    getJobs: (query: JobsQuery) => void;
}

function mapStateToProps(state: CombinedState): StateToProps {
    const {
        jobs: jobs,
        annotation: {
            job: {
                instance: jobInstance,
                instance: { stopFrame },
            },
        }
    } = state;

    console.log('Jobs prop:', jobs);
    return {
        jobInstance,
        stopFrame,
        currentJobs: jobs.current
    };
}

function mapDispatchToProps(dispatch: any): DispatchToProps {
    return {
        showExportModal(jobInstance: any): void {
            dispatch(exportActions.openExportDatasetModal(jobInstance));
        },
        showImportModal(jobInstance: any): void {
            dispatch(importActions.openImportDatasetModal(jobInstance));
        },
        removeAnnotations(startnumber: number, endnumber: number, delTrackKeyframesOnly:boolean) {
            dispatch(removeAnnotationsAsyncAction(startnumber, endnumber, delTrackKeyframesOnly));
        },
        setForceExitAnnotationFlag(forceExit: boolean): void {
            dispatch(setForceExitAnnotationFlagAction(forceExit));
        },
        saveAnnotations(jobInstance: any, afterSave?: () => void): void {
            dispatch(saveAnnotationsAsync(jobInstance, afterSave));
        },
        updateJob(jobInstance: any): void {
            dispatch(updateJobAsync(jobInstance));
        },
        getJobs(query: JobsQuery): void {
            dispatch(getJobsAsync({ ...query}));
        },
    };
}

type Props = StateToProps & DispatchToProps & RouteComponentProps;

function AnnotationMenuContainer(props: Props): JSX.Element {
    const {
        jobInstance,
        stopFrame,
        currentJobs,
        history,
        showExportModal,
        showImportModal,
        removeAnnotations,
        setForceExitAnnotationFlag,
        saveAnnotations,
        updateJob,
        getJobs,
    } = props;

    console.log("New jobs: ", currentJobs)

    const nextJobsQuery: JobsQuery = {
        page: 1,
        sort: null,
        search: null,
        filter: JSON.stringify({
            "and": [
                {
                    "!": {
                        "or": [
                            { "==" : [{"var":"state"}, "completed"]},
                            { "==" : [{"var": "stage"}, "acceptance"]},
                            { "==" : [{"var": "id"}, "1"]}
                        ]
                    }
                },
                { "==": [{"var":"assignee"}, "skall"] }
            ]
        })
    };


    const loadNextJob = async () => {
        try {
            const jobs = await core.jobs.get(filterNull(nextJobsQuery));
            console.log("Direct jobs: ", jobs)
            if (jobs  && jobs.length > 0) {
                const firstJob = jobs[0];
                history.push(`/tasks/${firstJob.taskId}/jobs/${firstJob.id}`);
            } else {
                console.log("No other jobs found, returning to main page")
                history.push(`/jobs?page=1`);
            }
        } catch (error) {
            console.error('Error when fetching next job:', error);
        }
    };

    const onClickMenu = async (params: MenuInfo) => {
        const [action] = params.keyPath;
        if (action === Actions.EXPORT_JOB_DATASET) {
            showExportModal(jobInstance);
        } else if (action === Actions.RENEW_JOB) {
            jobInstance.state = core.enums.JobState.NEW;
            jobInstance.stage = JobStage.ANNOTATION;
            updateJob(jobInstance);
            window.location.reload();
        } else if (action === Actions.FINISH_JOB) {
            jobInstance.stage = JobStage.ACCEPTANCE;
            jobInstance.state = core.enums.JobState.COMPLETED;
            updateJob(jobInstance);
            await loadNextJob();
        } else if (action === Actions.OPEN_TASK) {
            history.push(`/tasks/${jobInstance.taskId}`);
        } else if (action.startsWith('state:')) {
            [, jobInstance.state] = action.split(':');
            updateJob(jobInstance);
            window.location.reload();
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
