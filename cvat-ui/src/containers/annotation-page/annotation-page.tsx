// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

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

function mapStateToProps(state: CombinedState, own: OwnProps): StateToProps {
    const { params } = own.match;
    const jobID = +params.jid;
    const {
        annotation: {
            job: {
                instance: job,
                fetching,
            },
        },
    } = state;

    return {
        job: !job || jobID === job.id ? job : null,
        fetching,
    };
}

function mapDispatchToProps(dispatch: any, own: OwnProps): DispatchToProps {
    const { params } = own.match;
    const taskID = +params.tid;
    const jobID = +params.jid;
    const searchParams = new URLSearchParams(window.location.search);
    const initialFilters: string[] = [];
    let initialFrame = 0;


    if (searchParams.has('frame')) {
        const searchFrame = +(searchParams.get('frame') as string);
        if (!Number.isNaN(searchFrame)) {
            initialFrame = searchFrame;
        }
    }

    if (searchParams.has('object')) {
        const searchObject = +(searchParams.get('object') as string);
        if (!Number.isNaN(searchObject)) {
            initialFilters.push(`serverID==${searchObject}`);
        }
    }

    if (searchParams.has('frame') || searchParams.has('object')) {
        own.history.replace(own.history.location.state);
    }

    return {
        getJob(): void {
            dispatch(getJobAsync(taskID, jobID, initialFrame, initialFilters));
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
