import React from 'react';
import { connect } from 'react-redux';
import { withRouter } from 'react-router-dom';
import { RouteComponentProps } from 'react-router';

import AnnotationPageComponent from 'components/annotation-page/annotation-page';
import { getJobAsync } from 'actions/annotation-actions';

import {
    CombinedState,
} from 'reducers/interfaces';

type OwnProps = RouteComponentProps<{
    tid: string;
    jid: string;
}>;

interface StateToProps {
    job: any | null | undefined;
    fetching: boolean;
}

interface DispatchToProps {
    getJob(): void;
}

function mapStateToProps(state: CombinedState): StateToProps {
    const {
        annotation: {
            job: {
                instance: job,
                fetching,
            },
        },
    } = state;

    return {
        job,
        fetching,
    };
}

function mapDispatchToProps(dispatch: any, own: OwnProps): DispatchToProps {
    const { params } = own.match;
    const taskID = +params.tid;
    const jobID = +params.jid;

    return {
        getJob(): void {
            dispatch(getJobAsync(taskID, jobID));
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
