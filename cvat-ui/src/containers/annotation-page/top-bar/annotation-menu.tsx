// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) 2022 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useEffect } from 'react';
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
import { updateHistoryFromQuery } from '../../../components/resource-sorting-filtering';

const core = getCore();

interface StateToProps {
    jobInstance: any;
    stopFrame: number;
    jobs: JobsState;
}

interface DispatchToProps {
    showExportModal: (jobInstance: any) => void;
    showImportModal: (jobInstance: any) => void;
    removeAnnotations(startnumber: number, endnumber: number, delTrackKeyframesOnly: boolean): void;
    setForceExitAnnotationFlag(forceExit: boolean): void;
    saveAnnotations(jobInstance: any, afterSave?: () => void): void;
    updateJob(jobInstance: any): void;
    getJobs(query: JobsQuery): void;
}

function mapStateToProps(state: CombinedState): StateToProps {
    const {
        annotation: {
            job: {
                instance: jobInstance,
                instance: { stopFrame },
            },
        },
        jobs: jobs
    } = state;

    return {
        jobInstance,
        stopFrame,
        jobs
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
        jobs,
        history,
        showExportModal,
        showImportModal,
        removeAnnotations,
        setForceExitAnnotationFlag,
        saveAnnotations,
        updateJob,
        getJobs,
    } = props;

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

    const gotoNextJob = async () => {
        try {
            console.log("Query: ", nextJobsQuery)
            history.replace({
                search: updateHistoryFromQuery(nextJobsQuery),
            });
            await getJobs({...nextJobsQuery});
            console.log("Jobs actual:", jobs);
            if (jobs && jobs.current && jobs.current.length > 0) {
                const firstJob = jobs.current[0];
                console.log('Extracted Job:', firstJob);
                console.log("Jobs now: ", jobs)
                history.push(`/tasks/${firstJob.taskId}/jobs/${firstJob.id}`);
            } else {
                console.log("No other jobs found, returning to main page")
                history.push(`/jobs?page=1`);
            }
        } catch (error) {
            console.error('Error when fetching next job:', error);
        }
    };


    const onClickMenu = (params: MenuInfo): void => {
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
            gotoNextJob();
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
