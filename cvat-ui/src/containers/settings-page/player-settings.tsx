import React from 'react';
import { connect } from 'react-redux';

import PlayerSettingsComponent from '../../components/settings-page/player-settings';

import {
    CombinedState,
    FrameSpeed,
    GridColor,
} from '../../reducers/interfaces';

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
    onSwitchRotateAll(enabled: boolean): void;
    onSwitchGrid(enabled: boolean): void;
    onChangeGridSize(size: number): void;
    onChangeGridColor(color: GridColor): void;
    onChangeGridOpacity(opacity: number): void;
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

function mapDispatchToProps(): DispatchToProps {
    return {
        onChangeFrameStep(step: number): void {

        },
        onChangeFrameSpeed(speed: FrameSpeed): void {

        },
        onSwitchResetZoom(enabled: boolean): void {

        },
        onSwitchRotateAll(enabled: boolean): void {

        },
        onSwitchGrid(enabled: boolean): void {

        },
        onChangeGridSize(size: number): void {

        },
        onChangeGridColor(color: GridColor): void {

        },
        onChangeGridOpacity(opacity: number): void {

        },
        onChangeBrightnessLevel(level: number): void {

        },
        onChangeContrastLevel(level: number): void {

        },
        onChangeSaturationLevel(level: number): void {

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
