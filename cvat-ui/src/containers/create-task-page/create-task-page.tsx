import React from 'react';
import { connect } from 'react-redux';

import { CombinedState } from '../../reducers/interfaces';
import CreateTaskComponent from '../../components/create-task-page/create-task-page';
import { CreateTaskData } from '../../components/create-task-page/create-task-content';
import { createTaskAsync } from '../../actions/tasks-actions';

interface StateToProps {
    status: string;
    installedGit: boolean;
}

interface DispatchToProps {
    create: (data: CreateTaskData) => void;
}

function mapDispatchToProps(dispatch: any): DispatchToProps {
    return {
        create: (data: CreateTaskData) => dispatch(createTaskAsync(data)),
    };
}

function mapStateToProps(state: CombinedState): StateToProps {
    const { creates } = state.tasks.activities;
    return {
        ...creates,
        installedGit: state.plugins.plugins.GIT_INTEGRATION,
    };
}

function CreateTaskPageContainer(props: StateToProps & DispatchToProps) {
    return (
        <CreateTaskComponent
            status={props.status}
            onCreate={props.create}
            installedGit={props.installedGit}
        />
    );
}

export default connect(
    mapStateToProps,
    mapDispatchToProps,
)(CreateTaskPageContainer);
