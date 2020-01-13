import React from 'react';
import { connect } from 'react-redux';

import PlayerSettingsComponent from '../../components/settings-page/player-settings';

import {
    switchRotateAll,
    switchGrid,
    changeGridSize,
    changeGridColor,
    changeGridOpacity,
} from '../../actions/settings-actions';

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
        // will be implemented
        // eslint-disable-next-line
        onChangeFrameStep(step: number): void {

        },
        // will be implemented
        // eslint-disable-next-line
        onChangeFrameSpeed(speed: FrameSpeed): void {

        },
        // will be implemented
        // eslint-disable-next-line
        onSwitchResetZoom(enabled: boolean): void {

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
        // will be implemented
        // eslint-disable-next-line
        onChangeBrightnessLevel(level: number): void {

        },
        // will be implemented
        // eslint-disable-next-line
        onChangeContrastLevel(level: number): void {

        },
        // will be implemented
        // eslint-disable-next-line
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
