// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { connect } from 'react-redux';

import {
    switchAutoSave,
    changeAutoSaveInterval,
    changeAAMZoomMargin,
    switchShowingInterpolatedTracks,
    switchShowingObjectsTextAlways,
} from 'actions/settings-actions';

import { CombinedState } from 'reducers/interfaces';

import WorkspaceSettingsComponent from 'components/settings-page/workspace-settings';

interface StateToProps {
    autoSave: boolean;
    autoSaveInterval: number;
    aamZoomMargin: number;
    showAllInterpolationTracks: boolean;
    showObjectsTextAlways: boolean;
}

interface DispatchToProps {
    onSwitchAutoSave(enabled: boolean): void;
    onChangeAutoSaveInterval(interval: number): void;
    onChangeAAMZoomMargin(margin: number): void;
    onSwitchShowingInterpolatedTracks(enabled: boolean): void;
    onSwitchShowingObjectsTextAlways(enabled: boolean): void;
}

function mapStateToProps(state: CombinedState): StateToProps {
    const { workspace } = state.settings;
    const {
        autoSave,
        autoSaveInterval,
        aamZoomMargin,
        showAllInterpolationTracks,
        showObjectsTextAlways,
    } = workspace;

    return {
        autoSave,
        autoSaveInterval,
        aamZoomMargin,
        showAllInterpolationTracks,
        showObjectsTextAlways,
    };
}

function mapDispatchToProps(dispatch: any): DispatchToProps {
    return {
        onSwitchAutoSave(enabled: boolean): void {
            dispatch(switchAutoSave(enabled));
        },
        onChangeAutoSaveInterval(interval: number): void {
            dispatch(changeAutoSaveInterval(interval));
        },
        onChangeAAMZoomMargin(margin: number): void {
            dispatch(changeAAMZoomMargin(margin));
        },
        onSwitchShowingInterpolatedTracks(enabled: boolean): void {
            dispatch(switchShowingInterpolatedTracks(enabled));
        },
        onSwitchShowingObjectsTextAlways(enabled: boolean): void {
            dispatch(switchShowingObjectsTextAlways(enabled));
        },
    };
}

function WorkspaceSettingsContainer(props: StateToProps & DispatchToProps): JSX.Element {
    return (
        <WorkspaceSettingsComponent {...props} />
    );
}

export default connect(
    mapStateToProps,
    mapDispatchToProps,
)(WorkspaceSettingsContainer);
