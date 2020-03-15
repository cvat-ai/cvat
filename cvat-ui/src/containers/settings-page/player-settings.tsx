// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { connect } from 'react-redux';

import PlayerSettingsComponent from 'components/settings-page/player-settings';

import {
    changeFrameStep,
    changeFrameSpeed,
    switchResetZoom,
    switchRotateAll,
    switchGrid,
    changeGridSize,
    changeGridColor,
    changeGridOpacity,
    changeBrightnessLevel,
    changeContrastLevel,
    changeSaturationLevel,
} from 'actions/settings-actions';

import {
    CombinedState,
    FrameSpeed,
    GridColor,
} from 'reducers/interfaces';

interface StateToProps {
    frameStep: number;
    frameSpeed: FrameSpeed;
    resetZoom: boolean;
    rotateAll: boolean;
    grid: boolean;
    gridSize: number;
    gridColor: GridColor;
    gridOpacity: number;
    brightnessLevel: number;
    contrastLevel: number;
    saturationLevel: number;
}

interface DispatchToProps {
    onChangeFrameStep(step: number): void;
    onChangeFrameSpeed(speed: FrameSpeed): void;
    onSwitchResetZoom(enabled: boolean): void;
    onSwitchRotateAll(rotateAll: boolean): void;
    onSwitchGrid(grid: boolean): void;
    onChangeGridSize(gridSize: number): void;
    onChangeGridColor(gridColor: GridColor): void;
    onChangeGridOpacity(gridOpacity: number): void;
    onChangeBrightnessLevel(level: number): void;
    onChangeContrastLevel(level: number): void;
    onChangeSaturationLevel(level: number): void;
}

function mapStateToProps(state: CombinedState): StateToProps {
    const { player } = state.settings;
    return {
        ...player,
    };
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
        onSwitchGrid(grid: boolean): void {
            dispatch(switchGrid(grid));
        },
        onChangeGridSize(gridSize: number): void {
            dispatch(changeGridSize(gridSize));
        },
        onChangeGridColor(gridColor: GridColor): void {
            dispatch(changeGridColor(gridColor));
        },
        onChangeGridOpacity(gridOpacity: number): void {
            dispatch(changeGridOpacity(gridOpacity));
        },
        onChangeBrightnessLevel(level: number): void {
            dispatch(changeBrightnessLevel(level));
        },
        onChangeContrastLevel(level: number): void {
            dispatch(changeContrastLevel(level));
        },
        onChangeSaturationLevel(level: number): void {
            dispatch(changeSaturationLevel(level));
        },
    };
}

function PlayerSettingsContainer(props: StateToProps & DispatchToProps): JSX.Element {
    return (
        <PlayerSettingsComponent {...props} />
    );
}

export default connect(
    mapStateToProps,
    mapDispatchToProps,
)(PlayerSettingsContainer);
