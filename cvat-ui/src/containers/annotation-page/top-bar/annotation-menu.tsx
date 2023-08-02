// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) 2022 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { withRouter, RouteComponentProps } from 'react-router';
import { connect } from 'react-redux';
// eslint-disable-next-line import/no-extraneous-dependencies
import { MenuInfo } from 'rc-menu/lib/interface';

import { CombinedState, JobStage, TasksQuery, TasksState } from 'reducers';
import AnnotationMenuComponent, { Actions } from 'components/annotation-page/top-bar/annotation-menu';
import { getTasksAsync, updateJobAsync } from 'actions/tasks-actions';
import {
    saveAnnotationsAsync,
    setForceExitAnnotationFlag as setForceExitAnnotationFlagAction,
    removeAnnotationsAsync as removeAnnotationsAsyncAction,
} from 'actions/annotation-actions';
import { exportActions } from 'actions/export-actions';
import { importActions } from 'actions/import-actions';
import { getCore } from 'cvat-core-wrapper';
import { useEffect } from 'react';

const core = getCore();

interface StateToProps {
    jobInstance: any;
    stopFrame: number;
    tasks: TasksState;
}

interface DispatchToProps {
    showExportModal: (jobInstance: any) => void;
    showImportModal: (jobInstance: any) => void;
    removeAnnotations(startnumber: number, endnumber: number, delTrackKeyframesOnly: boolean): void;
    setForceExitAnnotationFlag(forceExit: boolean): void;
    saveAnnotations(jobInstance: any, afterSave?: () => void): void;
    updateJob(jobInstance: any): void;
    getTasks: (query: TasksQuery) => void;
}

function mapStateToProps(state: CombinedState): StateToProps {
    const {
        annotation: { job: { instance: jobInstance, instance: { stopFrame } } },
    } = state;

    return {
        jobInstance,
        stopFrame,
        tasks: state.tasks,
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
        getTasks: (query: TasksQuery): void => {
            dispatch(getTasksAsync(query));
        },
    };
}

type Props = StateToProps & DispatchToProps & RouteComponentProps;

function AnnotationMenuContainer(props: Props): JSX.Element {
    const {
        jobInstance,
        stopFrame,
        tasks,
        history,
        showExportModal,
        showImportModal,
        removeAnnotations,
        setForceExitAnnotationFlag,
        saveAnnotations,
        updateJob,
        getTasks,
    } = props;

    const nextTasksQuery: TasksQuery = {
        id: null,
        projectId: null,
        page: 1,
        sort: null,
        search: null,
        filter: "{\n" +
            "  \"and\": [\n" +
            "    { \"==\": [{ \"var\": \"assignee\" }, \"skall\" ] },\n" +
            "    { \"!\": { \"in\": [{ \"var\": \"status\" }, [\"completed\"]] } }\n" +
            "  ]\n" +
            "}"
    };

    const gotoNextJob = async () => {
        try {
            await getTasks(nextTasksQuery);
            console.log("Tasks actual:", tasks);
            if (tasks && tasks.current && tasks.current.length > 0) {
                const firstTask = tasks.current[0];
                console.log('Extracted Task:', firstTask);
                history.push(`/tasks/${firstTask.id}/jobs/${firstTask.id}`);
            }
        } catch (error) {
            console.error('Error when fetching tasks:', error);
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
