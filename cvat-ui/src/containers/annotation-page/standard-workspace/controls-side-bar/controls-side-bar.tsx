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
    onMergeStart(): void;
    onGroupStart(): void;
    onSplitStart(): void;
}

function mapStateToProps(state: CombinedState): StateToProps {
    const {
        annotation,
        settings,
    } = state;

    const {
        canvasInstance,
        activeControl,
    } = annotation;

    const labels = annotation.jobInstance.task.labels
        .reduce((acc: StringObject, label: any): StringObject => {
            acc[label.id as number] = label.name;
            return acc;
        }, {});

    return {
        rotateAll: settings.player.rotateAll,
        canvasInstance,
        activeControl,
        labels,
    };
}

function dispatchToProps(dispatch: any): DispatchToProps {
    return {
        onMergeStart(): void {
            dispatch(mergeObjects());
        },
        onGroupStart(): void {
            dispatch(groupObjects());
        },
        onSplitStart(): void {
            dispatch(splitTrack());
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
