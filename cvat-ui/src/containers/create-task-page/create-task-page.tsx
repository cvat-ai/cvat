import React from 'react';
import { connect } from 'react-redux';

import { CombinedState } from '../../reducers/root-reducer';
import CreateTaskComponent from '../../components/create-task-page/create-task-page';
import { CreateTaskData } from '../../components/create-task-page/create-task-content';
import { createTaskAsync } from '../../actions/tasks-actions';

interface StateToProps {
    creatingError: string;
    status: string;
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
        creatingError: creates.creatingError ? creates.creatingError.toString() : '',
    };
}

function CreateTaskPageContainer(props: StateToProps & DispatchToProps) {
    return (
        <CreateTaskComponent error={props.creatingError} status={props.status} onCreate={props.create}/>
    );
}

export default connect(
    mapStateToProps,
    mapDispatchToProps,
)(CreateTaskPageContainer);
