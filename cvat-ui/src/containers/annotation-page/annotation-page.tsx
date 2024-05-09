// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) 2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { connect } from 'react-redux';
import { withRouter } from 'react-router-dom';
import { RouteComponentProps } from 'react-router';

import AnnotationPageComponent from 'components/annotation-page/annotation-page';
import {
    getJobAsync, saveLogsAsync, changeFrameAsync,
    closeJob as closeJobAction,
} from 'actions/annotation-actions';

import { CombinedState, Workspace } from 'reducers';

type OwnProps = RouteComponentProps<{
    tid: string;
    jid: string;
}>;

interface StateToProps {
    job: any | null | undefined;
    frameNumber: number;
    fetching: boolean;
    annotationsInitialized: boolean;
    workspace: Workspace;
}

interface DispatchToProps {
    getJob(): void;
    changeFrame(frame: number): void;
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
            player: {
                frame: {
                    number: frameNumber,
                },
            },
            annotations: {
                initialized: annotationsInitialized,
            },
        },
    } = state;

    return {
        job: jobID === requestedId || (Number.isNaN(jobID) && Number.isNaN(requestedId)) ? job : null,
        fetching,
        workspace,
        frameNumber,
        annotationsInitialized,
    };
}

function mapDispatchToProps(dispatch: any, own: OwnProps): DispatchToProps {
    const { params } = own.match;
    const taskID = +params.tid;
    const jobID = +params.jid;
    const searchParams = new URLSearchParams(window.location.search);
    const initialFilters: object[] = [];
    const initialOpenGuide = searchParams.has('openGuide');

    const parsedPointsCount = +(searchParams.get('defaultPointsCount') || 'NaN');
    const defaultLabel = searchParams.get('defaultLabel') || null;
    const defaultPointsCount = Number.isInteger(parsedPointsCount) && parsedPointsCount >= 1 ? parsedPointsCount : null;
    const initialWorkspace = Object.entries(Workspace).find(([key]) => (
        key === searchParams.get('defaultWorkspace')?.toUpperCase()
    )) || null;

    const parsedFrame = +(searchParams.get('frame') || 'NaN');
    const initialFrame = Number.isInteger(parsedFrame) && parsedFrame >= 0 ? parsedFrame : null;

    if (searchParams.has('serverID') && searchParams.has('type')) {
        const serverID = searchParams.get('serverID');
        const type = searchParams.get('type');
        if (serverID && !Number.isNaN(+serverID)) {
            initialFilters.push({
                and: [{ '==': [{ var: 'serverID' }, serverID] }, { '==': [{ var: 'type' }, type] }],
            });
        }
    }

    const initialSize = searchParams.size;
    searchParams.delete('frame');
    searchParams.delete('serverID');
    searchParams.delete('type');
    searchParams.delete('openGuide');

    if (searchParams.size !== initialSize) {
        own.history.replace(`${own.history.location.pathname}?${searchParams.toString()}`);
    }

    return {
        getJob(): void {
            dispatch(getJobAsync({
                taskID,
                jobID,
                initialFrame,
                initialFilters,
                queryParameters: {
                    initialOpenGuide,
                    defaultLabel,
                    defaultPointsCount,
                    ...(initialWorkspace ? { initialWorkspace: initialWorkspace[1] } : { initialWorkspace }),
                },
            }));
        },
        saveLogs(): void {
            dispatch(saveLogsAsync());
        },
        closeJob(): void {
            dispatch(closeJobAction());
        },
        changeFrame(frame: number): void {
            dispatch(changeFrameAsync(frame));
        },
    };
}

export default withRouter(connect(mapStateToProps, mapDispatchToProps)(AnnotationPageComponent));
