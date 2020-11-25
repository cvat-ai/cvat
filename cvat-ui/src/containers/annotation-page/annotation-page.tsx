// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import { connect } from 'react-redux';
import { withRouter } from 'react-router-dom';
import { RouteComponentProps } from 'react-router';

import AnnotationPageComponent from 'components/annotation-page/annotation-page';
import { getJobAsync, saveLogsAsync, closeJob as closeJobAction } from 'actions/annotation-actions';

import { CombinedState, Workspace } from 'reducers/interfaces';

type OwnProps = RouteComponentProps<{
    tid: string;
    jid: string;
}>;

interface StateToProps {
    job: any | null | undefined;
    fetching: boolean;
    workspace: Workspace;
}

interface DispatchToProps {
    getJob(): void;
    saveLogs(): void;
    closeJob(): void;
}

function mapStateToProps(state: CombinedState, own: OwnProps): StateToProps {
    const { params } = own.match;
    const jobID = +params.jid;
    const {
        annotation: {
            job: { requestedId, instance: job, fetching },
            workspace,
        },
    } = state;

    return {
        job: jobID === requestedId ? job : null,
        fetching,
        workspace,
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

    if (searchParams.has('serverID') && searchParams.has('type')) {
        const serverID = searchParams.get('serverID');
        const type = searchParams.get('type');
        if (serverID && !Number.isNaN(+serverID)) {
            initialFilters.push(`serverID==${serverID} & type=="${type}"`);
        }
    }

    if (searchParams.has('frame') || searchParams.has('object')) {
        own.history.replace(own.history.location.state);
    }

    return {
        getJob(): void {
            dispatch(getJobAsync(taskID, jobID, initialFrame, initialFilters));
        },
        saveLogs(): void {
            dispatch(saveLogsAsync());
        },
        closeJob(): void {
            dispatch(closeJobAction());
        },
    };
}

export default withRouter(connect(mapStateToProps, mapDispatchToProps)(AnnotationPageComponent));
