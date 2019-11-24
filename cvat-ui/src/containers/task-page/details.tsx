import React from 'react';
import { connect } from 'react-redux';

import DetailsComponent from '../../components/task-page/details';
import { CombinedState } from '../../reducers/root-reducer';
import { updateTaskAsync } from '../../actions/task-actions';

interface StateToProps {
    previewImage: string;
    taskInstance: any;
    registeredUsers: any[];
    installedGit: boolean;
}

interface DispatchToProps {
    onTaskUpdate: (taskInstance: any) => void;
}

function mapStateToProps(state: CombinedState): StateToProps {
    const { plugins } = state.plugins;
    const taskInstance = (state.activeTask.task as any).instance;
    const previewImage = (state.activeTask.task as any).preview;

    return {
        registeredUsers: state.users.users,
        taskInstance,
        previewImage,
        installedGit: plugins.GIT_INTEGRATION,
    };
}


function mapDispatchToProps(dispatch: any): DispatchToProps {
    return {
        onTaskUpdate: (taskInstance: any) =>
            dispatch(updateTaskAsync(taskInstance))
    }
}


function TaskPageContainer(props: StateToProps & DispatchToProps) {
    return (
        <DetailsComponent
            previewImage={props.previewImage}
            taskInstance={props.taskInstance}
            installedGit={props.installedGit}
            onTaskUpdate={props.onTaskUpdate}
            registeredUsers={props.registeredUsers}
        />
    );
}

export default connect(
    mapStateToProps,
    mapDispatchToProps,
)(TaskPageContainer);