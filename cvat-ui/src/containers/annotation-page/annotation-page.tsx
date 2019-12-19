import React from 'react';
import { connect } from 'react-redux';
import { withRouter } from 'react-router-dom';
import { RouteComponentProps } from 'react-router';

import AnnotationPageComponent from '../../components/annotation-page/annotation-page';
import { getTasksAsync } from '../../actions/tasks-actions';

import {
    CombinedState,
    Task,
} from '../../reducers/interfaces';

type OwnProps = RouteComponentProps<{
    tid: string;
    jid: string;
}>;

interface StateToProps {
    jobInstance: any | null | undefined;
    fetching: boolean;
}

interface DispatchToProps {
    getJob(): void;
}

function mapStateToProps(state: CombinedState, own: OwnProps): StateToProps {
    const { tasks } = state;
    const {
        gettingQuery,
        current,
    } = tasks;
    const { params } = own.match;
    const taskID = +params.tid;
    const jobID = +params.jid;

    const filteredTasks = current
        .filter((_task: Task) => _task.instance.id === taskID);
    const task = filteredTasks[0] || (gettingQuery.id === taskID || Number.isNaN(taskID)
        ? undefined : null);

    const job = task ? task.instance.jobs
        .filter((_job: any) => _job.id === jobID)[0] : task;

    return {
        jobInstance: job,
        fetching: tasks.fetching,
    };
}

function mapDispatchToProps(dispatch: any, own: OwnProps): DispatchToProps {
    const { params } = own.match;
    const taskID = +params.tid;

    return {
        getJob(): void {
            dispatch(getTasksAsync({
                id: taskID,
                page: 1,
                search: null,
                owner: null,
                assignee: null,
                name: null,
                status: null,
                mode: null,
            }));
        },
    };
}

function AnnotationPageContainer(props: StateToProps & DispatchToProps): JSX.Element {
    return (
        <AnnotationPageComponent {...props} />
    );
}

export default withRouter(
    connect(
        mapStateToProps,
        mapDispatchToProps,
    )(AnnotationPageContainer),
);
