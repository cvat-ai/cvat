import React from 'react';
import { connect } from 'react-redux';

import JobListComponent from '../../components/task-page/job-list';
import { CombinedState } from '../../reducers/root-reducer';
import { updateJobAsync } from '../../actions/task-actions';

interface StateToProps {
    taskInstance: any;
    registeredUsers: any[];
}

interface DispatchToProps {
    onJobUpdate(jobInstance: any): void;
}

function mapStateToProps(state: CombinedState): StateToProps {
    return {
        taskInstance: state.activeTask.task ? state.activeTask.task.instance : null,
        registeredUsers: state.users.users,
    };
}

function mapDispatchToProps(dispatch: any): DispatchToProps {
    return {
        onJobUpdate: (jobInstance: any) => dispatch(updateJobAsync(jobInstance)),
    };
}

function TaskPageContainer(props: StateToProps & DispatchToProps) {
    return (
        <JobListComponent
            taskInstance={props.taskInstance}
            registeredUsers={props.registeredUsers}
            onJobUpdate={props.onJobUpdate}
        />
    );
}

export default connect(
    mapStateToProps,
    mapDispatchToProps,
)(TaskPageContainer);