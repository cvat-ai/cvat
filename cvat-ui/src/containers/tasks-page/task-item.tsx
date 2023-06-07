// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) 2022-2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { connect } from 'react-redux';

import {
    TasksQuery, CombinedState, ActiveInference, PluginComponent,
} from 'reducers';

import TaskItemComponent from 'components/tasks-page/task-item';

import { getTasksAsync } from 'actions/tasks-actions';
import { cancelInferenceAsync } from 'actions/models-actions';

interface StateToProps {
    deleted: boolean;
    hidden: boolean;
    taskInstance: any;
    activeInference: ActiveInference | null;
    taskNamePlugins: PluginComponent[];
}

interface DispatchToProps {
    getTasks(query: TasksQuery): void;
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
        hidden: state.tasks.hideEmpty && task.size === 0,
        deleted: id in deletes ? deletes[id] === true : false,
        taskInstance: task,
        activeInference: state.models.inferences[id] || null,
        taskNamePlugins: state.plugins.components.taskItem.name,
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
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(TaskItemComponent);
