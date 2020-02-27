// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { connect } from 'react-redux';

import DetailsComponent from 'components/task-page/details';
import { updateTaskAsync } from 'actions/tasks-actions';
import {
    Task,
    CombinedState,
} from 'reducers/interfaces';

interface OwnProps {
    task: Task;
}

interface StateToProps {
    registeredUsers: any[];
    installedGit: boolean;
}

interface DispatchToProps {
    onTaskUpdate: (taskInstance: any) => void;
}

function mapStateToProps(state: CombinedState): StateToProps {
    const { list } = state.plugins;

    return {
        registeredUsers: state.users.users,
        installedGit: list.GIT_INTEGRATION,
    };
}


function mapDispatchToProps(dispatch: any): DispatchToProps {
    return {
        onTaskUpdate: (taskInstance: any): void => dispatch(updateTaskAsync(taskInstance)),
    };
}


function TaskPageContainer(props: StateToProps & DispatchToProps & OwnProps): JSX.Element {
    const {
        task,
        installedGit,
        registeredUsers,
        onTaskUpdate,
    } = props;

    return (
        <DetailsComponent
            previewImage={task.preview}
            taskInstance={task.instance}
            installedGit={installedGit}
            onTaskUpdate={onTaskUpdate}
            registeredUsers={registeredUsers}
        />
    );
}

export default connect(
    mapStateToProps,
    mapDispatchToProps,
)(TaskPageContainer);
