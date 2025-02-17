// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { connect } from 'react-redux';

import { Task, Request } from 'cvat-core-wrapper';
import { CombinedState, ActiveInference, PluginComponent } from 'reducers';
import TaskItemComponent from 'components/tasks-page/task-item';
import { updateTaskInState as updateTaskInStateAction, getTaskPreviewAsync } from 'actions/tasks-actions';
import { cancelInferenceAsync } from 'actions/models-actions';

interface StateToProps {
    deleted: boolean;
    taskInstance: any;
    activeInference: ActiveInference | null;
    activeRequest: Request | null;
    ribbonPlugins: PluginComponent[];
}

interface DispatchToProps {
    updateTaskInState(task: Task): void;
    cancelAutoAnnotation(): void;
}

interface OwnProps {
    idx: number;
    taskID: number;
}

function mapStateToProps(state: CombinedState, own: OwnProps): StateToProps {
    const task = state.tasks.current[own.idx];
    const { deletes } = state.tasks.activities;
    const { requests } = state.requests;
    const activeRequest = Object.values(requests).find((request: Request) => {
        const { operation: { type, taskID } } = request;
        return type === 'create:task' && task.id === taskID;
    });
    const id = own.taskID;

    return {
        deleted: id in deletes ? deletes[id] === true : false,
        taskInstance: task,
        activeInference: state.models.inferences[id] || null,
        ribbonPlugins: state.plugins.components.taskItem.ribbon,
        activeRequest: activeRequest || null,
    };
}

function mapDispatchToProps(dispatch: any, own: OwnProps): DispatchToProps {
    return {
        cancelAutoAnnotation(): void {
            dispatch(cancelInferenceAsync(own.taskID));
        },
        updateTaskInState(task: Task): void {
            dispatch(updateTaskInStateAction(task));
            dispatch(getTaskPreviewAsync(task));
        },
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(TaskItemComponent);
