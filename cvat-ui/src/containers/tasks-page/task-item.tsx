// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) 2022-2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { connect } from 'react-redux';

import { Task } from 'cvat-core-wrapper';
import {
    TasksQuery, CombinedState, ActiveInference, PluginComponent,
} from 'reducers';
import TaskItemComponent from 'components/tasks-page/task-item';
import { getTasksAsync, updateTaskInState as updateTaskInStateAction, getTaskPreviewAsync } from 'actions/tasks-actions';
import { cancelInferenceAsync } from 'actions/models-actions';

interface StateToProps {
    deleted: boolean;
    taskInstance: any;
    activeInference: ActiveInference | null;
    ribbonPlugins: PluginComponent[];
}

interface DispatchToProps {
    getTasks(query: TasksQuery): void;
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
    const id = own.taskID;

    return {
        deleted: id in deletes ? deletes[id] === true : false,
        taskInstance: task,
        activeInference: state.models.inferences[id] || null,
        ribbonPlugins: state.plugins.components.taskItem.ribbon,
    };
}

function mapDispatchToProps(dispatch: any, own: OwnProps): DispatchToProps {
    return {
        getTasks(query: TasksQuery): void {
            dispatch(getTasksAsync(query));
        },
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
