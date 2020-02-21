import React from 'react';
import { connect } from 'react-redux';

import JobListComponent from 'components/task-page/job-list';
import { updateJobAsync } from 'actions/tasks-actions';
import { removeJob } from 'actions/annotation-actions';
import {
    Task,
    CombinedState,
} from 'reducers/interfaces';

interface OwnProps {
    task: Task;
}

interface StateToProps {
    registeredUsers: any[];
    currentJobId: number | null;
}

interface DispatchToProps {
    onJobUpdate(jobInstance: any): void;
    onJobRemove(): void;
}

function mapStateToProps(state: CombinedState): StateToProps {
    return {
        registeredUsers: state.users.users,
        currentJobId: state.annotation.job.instance ? state.annotation.job.instance.id : null,
    };
}

function mapDispatchToProps(dispatch: any): DispatchToProps {
    return {
        onJobUpdate: (jobInstance: any): void => dispatch(updateJobAsync(jobInstance)),
        onJobRemove: (): void => dispatch(removeJob()),
    };
}

function TaskPageContainer(props: StateToProps & DispatchToProps & OwnProps): JSX.Element {
    const {
        task,
        registeredUsers,
        onJobUpdate,
        currentJobId,
        onJobRemove,
    } = props;

    return (
        <JobListComponent
            taskInstance={task.instance}
            registeredUsers={registeredUsers}
            currentJobId={currentJobId}
            onJobUpdate={onJobUpdate}
            onJobremove={onJobRemove}
        />
    );
}

export default connect(
    mapStateToProps,
    mapDispatchToProps,
)(TaskPageContainer);
