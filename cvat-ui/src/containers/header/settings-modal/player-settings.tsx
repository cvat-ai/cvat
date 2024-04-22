// Copyright (C) 2020-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

import { connect } from 'react-redux';

import PlayerSettingsComponent from 'components/header/settings-modal/player-settings';
import {
    changeFrameStep,
    changeFrameSpeed,
    switchResetZoom,
    switchRotateAll,
    changeCanvasBackgroundColor,
    switchSmoothImage,
    switchShowingDeletedFrames,
} from 'actions/settings-actions';
import { CombinedState, FrameSpeed } from 'reducers';

interface StateToProps {
    frameStep: number;
    frameSpeed: FrameSpeed;
    resetZoom: boolean;
    rotateAll: boolean;
    smoothImage: boolean;
    canvasBackgroundColor: string;
    showDeletedFrames: boolean;
}

interface DispatchToProps {
    onChangeFrameStep(step: number): void;
    onChangeFrameSpeed(speed: FrameSpeed): void;
    onSwitchResetZoom(enabled: boolean): void;
    onSwitchRotateAll(rotateAll: boolean): void;
    onChangeCanvasBackgroundColor(color: string): void;
    onSwitchSmoothImage(enabled: boolean): void;
    onSwitchShowingDeletedFrames(enabled: boolean): void;
}

function mapStateToProps(state: CombinedState): StateToProps {
    const {
        settings: { player },
    } = state;

    return player;
}

function mapDispatchToProps(dispatch: any): DispatchToProps {
    return {
        onChangeFrameStep(step: number): void {
            dispatch(changeFrameStep(step));
        },
        onChangeFrameSpeed(speed: FrameSpeed): void {
            dispatch(changeFrameSpeed(speed));
        },
        onSwitchResetZoom(enabled: boolean): void {
            dispatch(switchResetZoom(enabled));
        },
        onSwitchRotateAll(rotateAll: boolean): void {
            dispatch(switchRotateAll(rotateAll));
        },
        onChangeCanvasBackgroundColor(color: string): void {
            dispatch(changeCanvasBackgroundColor(color));
        },
        onSwitchSmoothImage(enabled: boolean): void {
            dispatch(switchSmoothImage(enabled));
        },
        onSwitchShowingDeletedFrames(enabled: boolean): void {
            dispatch(switchShowingDeletedFrames(enabled));
        },
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(PlayerSettingsComponent);
