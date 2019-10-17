import React from 'react';
import { connect } from 'react-redux';

import {
    TasksQuery,
    ActiveTask,
    Task,
} from '../../reducers/interfaces';

import { CombinedState } from '../../reducers/root-reducer';

import TaskItemComponent from '../../components/tasks-page/task-item'

import {
    getTasksAsync,
    dumpAnnotationsAsync,
    loadAnnotationsAsync,
} from '../../actions/tasks-actions';

interface StateToProps {
    task: Task;
    activeTask: ActiveTask | undefined;
    loaders: any[];
    dumpers: any[];
}

interface DispatchToProps {
    getTasks: (query: TasksQuery) => void;
    dump: (task: any, format: string) => void;
    load: (task: any, format: string, file: File) => void;
}

interface OwnProps {
    idx: number;
    taskID: number;
}

function mapStateToProps(state: CombinedState, own: OwnProps): StateToProps {
    return {
        task: state.tasks.current[own.idx],
        activeTask: state.tasks.active[own.taskID],
        loaders: state.formats.loaders,
        dumpers: state.formats.dumpers,
    };
}

function mapDispatchToProps(dispatch: any): DispatchToProps {
    return {
        getTasks: (query: TasksQuery): void => {
            dispatch(getTasksAsync(query));
        },
        dump: (task: any, dumper: any): void => {
            dispatch(dumpAnnotationsAsync(task, dumper));
        },
        load: (task: any, loader: any, file: File): void => {
            dispatch(loadAnnotationsAsync(task, loader, file));
        },
    }
}

type TasksItemContainerProps = StateToProps & DispatchToProps & OwnProps;

function TaskItemContainer(props: TasksItemContainerProps) {
    return (
        <TaskItemComponent
            activeLoading={props.activeTask ? props.activeTask.load : null}
            activeDumpings={props.activeTask ? [...props.activeTask.dump] : []}
            task={props.task}
            loaders={props.loaders}
            dumpers={props.dumpers}
            onLoadAnnotation={props.load}
            onDumpAnnotation={props.dump}
        />
    );
}

export default connect(
    mapStateToProps,
    mapDispatchToProps,
)(TaskItemContainer);
