// Copyright (C) 2019-2022 Intel Corporation
// Copyright (C) 2022 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { connect } from 'react-redux';

import DetailsComponent from 'components/task-page/details';
import { updateTaskAsync } from 'actions/tasks-actions';
import { cancelInferenceAsync } from 'actions/models-actions';
import { Task, CombinedState, ActiveInference } from 'reducers';

interface OwnProps {
    task: Task;
}

interface StateToProps {
    activeInference: ActiveInference | null;
    installedGit: boolean;
    projectSubsets: string[];
    dumpers: any[];
    user: any;
}

interface DispatchToProps {
    cancelAutoAnnotation(): void;
    onTaskUpdate: (taskInstance: any) => void;
}

function mapStateToProps(state: CombinedState, own: OwnProps): StateToProps {
    const { list } = state.plugins;
    const [taskProject] = state.projects.current.filter((project) => project.id === own.task.projectId);

    return {
        dumpers: state.formats.annotationFormats.dumpers,
        user: state.auth.user,
        installedGit: list.GIT_INTEGRATION,
        activeInference: state.models.inferences[own.task.id] || null,
        projectSubsets: taskProject ?
            ([
                ...new Set(taskProject.subsets),
            ] as string[]) :
            [],
    };
}

function mapDispatchToProps(dispatch: any, own: OwnProps): DispatchToProps {
    return {
        onTaskUpdate(taskInstance: any): void {
            dispatch(updateTaskAsync(taskInstance));
        },
        cancelAutoAnnotation(): void {
            dispatch(cancelInferenceAsync(own.task.id));
        },
    };
}

function TaskPageContainer(props: StateToProps & DispatchToProps & OwnProps): JSX.Element {
    const {
        task, installedGit, activeInference, projectSubsets, cancelAutoAnnotation, onTaskUpdate, dumpers, user,
    } = props;

    return (
        <DetailsComponent
            dumpers={dumpers}
            user={user}
            taskInstance={task}
            installedGit={installedGit}
            activeInference={activeInference}
            projectSubsets={projectSubsets}
            onTaskUpdate={onTaskUpdate}
            cancelAutoAnnotation={cancelAutoAnnotation}
        />
    );
}

export default connect(mapStateToProps, mapDispatchToProps)(TaskPageContainer);
