import React from 'react';
import { connect } from 'react-redux';

import { Canvas } from 'cvat-canvas';

import {
    mergeObjects,
    groupObjects,
    splitTrack,
} from 'actions/annotation-actions';
import ControlsSideBarComponent from 'components/annotation-page/standard-workspace/controls-side-bar/controls-side-bar';
import {
    ActiveControl,
    CombinedState,
    StringObject,
} from 'reducers/interfaces';

interface StateToProps {
    canvasInstance: Canvas;
    rotateAll: boolean;
    activeControl: ActiveControl;
    labels: StringObject;
}

interface DispatchToProps {
    mergeObjects(enabled: boolean): void;
    groupObjects(enabled: boolean): void;
    splitTrack(enabled: boolean): void;
}

function mapStateToProps(state: CombinedState): StateToProps {
    const {
        annotation: {
            canvas: {
                instance: canvasInstance,
                activeControl,
            },
            job: {
                instance: jobInstance,
            },
        },
        settings: {
            player: {
                rotateAll,
            },
        },
    } = state;

    const labels = jobInstance.task.labels
        .reduce((acc: StringObject, label: any): StringObject => {
            acc[label.id as number] = label.name;
            return acc;
        }, {});

    return {
        rotateAll,
        canvasInstance,
        activeControl,
        labels,
    };
}

function dispatchToProps(dispatch: any): DispatchToProps {
    return {
        mergeObjects(enabled: boolean): void {
            dispatch(mergeObjects(enabled));
        },
        groupObjects(enabled: boolean): void {
            dispatch(groupObjects(enabled));
        },
        splitTrack(enabled: boolean): void {
            dispatch(splitTrack(enabled));
        },
    };
}

function StandardWorkspaceContainer(props: StateToProps & DispatchToProps): JSX.Element {
    return (
        <ControlsSideBarComponent {...props} />
    );
}

export default connect(
    mapStateToProps,
    dispatchToProps,
)(StandardWorkspaceContainer);
