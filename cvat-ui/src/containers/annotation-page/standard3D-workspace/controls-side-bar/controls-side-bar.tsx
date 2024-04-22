// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { connect } from 'react-redux';
import { KeyMap } from 'utils/mousetrap-react';
import { Canvas3d } from 'cvat-canvas3d-wrapper';
import {
    groupObjects,
    splitTrack,
    mergeObjects,
    pasteShapeAsync,
    redrawShapeAsync,
    repeatDrawShapeAsync,
    resetAnnotationsGroup,
} from 'actions/annotation-actions';
import ControlsSideBarComponent from 'components/annotation-page/standard3D-workspace/controls-side-bar/controls-side-bar';
import { ActiveControl, CombinedState } from 'reducers';

interface StateToProps {
    canvasInstance: Canvas3d;
    activeControl: ActiveControl;
    keyMap: KeyMap;
    normalizedKeyMap: Record<string, string>;
    labels: any[];
    jobInstance: any;
}

interface DispatchToProps {
    repeatDrawShape(): void;
    redrawShape(): void;
    pasteShape(): void;
    resetGroup(): void;
    groupObjects(enabled: boolean): void;
    mergeObjects(enabled: boolean): void;
    splitTrack(enabled: boolean): void;
}

function mapStateToProps(state: CombinedState): StateToProps {
    const {
        annotation: {
            canvas: { instance: canvasInstance, activeControl },
            job: { labels, instance: jobInstance },
        },
        shortcuts: { keyMap, normalizedKeyMap },
    } = state;

    return {
        canvasInstance: canvasInstance as Canvas3d,
        activeControl,
        normalizedKeyMap,
        keyMap,
        labels,
        jobInstance,
    };
}

function dispatchToProps(dispatch: any): DispatchToProps {
    return {
        repeatDrawShape(): void {
            dispatch(repeatDrawShapeAsync());
        },
        redrawShape(): void {
            dispatch(redrawShapeAsync());
        },
        pasteShape(): void {
            dispatch(pasteShapeAsync());
        },
        groupObjects(enabled: boolean): void {
            dispatch(groupObjects(enabled));
        },
        resetGroup(): void {
            dispatch(resetAnnotationsGroup());
        },
        mergeObjects(enabled: boolean): void {
            dispatch(mergeObjects(enabled));
        },
        splitTrack(enabled: boolean): void {
            dispatch(splitTrack(enabled));
        },
    };
}

export default connect(mapStateToProps, dispatchToProps)(ControlsSideBarComponent);
