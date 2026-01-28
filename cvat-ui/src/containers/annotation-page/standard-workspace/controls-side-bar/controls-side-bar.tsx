// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { connect } from 'react-redux';

import { Canvas } from 'cvat-canvas-wrapper';
import {
    updateActiveControl as updateActiveControlAction,
    redrawShapeAsync,
    rotateCurrentFrame,
    repeatDrawShapeAsync,
    pasteShapeAsync,
    resetAnnotationsGroup,
} from 'actions/annotation-actions';
import ControlsSideBarComponent from 'components/annotation-page/standard-workspace/controls-side-bar/controls-side-bar';
import { ActiveControl, CombinedState, Rotation } from 'reducers';
import { KeyMap } from 'utils/mousetrap-react';

interface StateToProps {
    canvasInstance: Canvas;
    rotateAll: boolean;
    activeControl: ActiveControl;
    keyMap: KeyMap;
    normalizedKeyMap: Record<string, string>;
    labels: CombinedState['annotation']['job']['labels'];
    frameData: any;
}

interface DispatchToProps {
    updateActiveControl(activeControl: ActiveControl): void;
    rotateFrame(angle: Rotation): void;
    resetGroup(): void;
    repeatDrawShape(): void;
    pasteShape(): void;
    redrawShape(): void;
}

function mapStateToProps(state: CombinedState): StateToProps {
    const {
        annotation: {
            canvas: { instance: canvasInstance, activeControl },
            job: { labels },
            player: {
                frame: { data: frameData },
            },
        },
        settings: {
            player: { rotateAll },
        },
        shortcuts: { keyMap, normalizedKeyMap },
    } = state;

    return {
        rotateAll,
        canvasInstance: canvasInstance as Canvas,
        activeControl,
        labels,
        normalizedKeyMap,
        keyMap,
        frameData,
    };
}

function dispatchToProps(dispatch: any): DispatchToProps {
    return {
        updateActiveControl(activeControl: ActiveControl): void {
            dispatch(updateActiveControlAction(activeControl));
        },
        rotateFrame(rotation: Rotation): void {
            dispatch(rotateCurrentFrame(rotation));
        },
        repeatDrawShape(): void {
            dispatch(repeatDrawShapeAsync());
        },
        pasteShape(): void {
            dispatch(pasteShapeAsync());
        },
        resetGroup(): void {
            dispatch(resetAnnotationsGroup());
        },
        redrawShape(): void {
            dispatch(redrawShapeAsync());
        },
    };
}

export default connect(mapStateToProps, dispatchToProps)(ControlsSideBarComponent);
