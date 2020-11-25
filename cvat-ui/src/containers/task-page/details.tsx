// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { connect } from 'react-redux';

import DetailsComponent from 'components/task-page/details';
import { updateTaskAsync } from 'actions/tasks-actions';
import { cancelInferenceAsync } from 'actions/models-actions';
import { Task, CombinedState, ActiveInference } from 'reducers/interfaces';

interface OwnProps {
    task: Task;
}

interface StateToProps {
    activeInference: ActiveInference | null;
    installedGit: boolean;
}

interface DispatchToProps {
    cancelAutoAnnotation(): void;
    onTaskUpdate: (taskInstance: any) => void;
}

function mapStateToProps(state: CombinedState, own: OwnProps): StateToProps {
    const { list } = state.plugins;

    return {
        installedGit: list.GIT_INTEGRATION,
        activeInference: state.models.inferences[own.task.instance.id] || null,
    };
}

function mapDispatchToProps(dispatch: any, own: OwnProps): DispatchToProps {
    return {
        onTaskUpdate(taskInstance: any): void {
            dispatch(updateTaskAsync(taskInstance));
        },
        cancelAutoAnnotation(): void {
            dispatch(cancelInferenceAsync(own.task.instance.id));
        },
    };
}

function TaskPageContainer(props: StateToProps & DispatchToProps & OwnProps): JSX.Element {
    const {
        task, installedGit, activeInference, cancelAutoAnnotation, onTaskUpdate,
    } = props;

    return (
        <DetailsComponent
            previewImage={task.preview}
            taskInstance={task.instance}
            installedGit={installedGit}
            activeInference={activeInference}
            onTaskUpdate={onTaskUpdate}
            cancelAutoAnnotation={cancelAutoAnnotation}
        />
    );
}

export default connect(mapStateToProps, mapDispatchToProps)(TaskPageContainer);
