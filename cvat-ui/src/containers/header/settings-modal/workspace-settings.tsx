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
    switchAutomaticBordering,
} from 'actions/settings-actions';

import { CombinedState } from 'reducers/interfaces';

import WorkspaceSettingsComponent from 'components/header/settings-modal/workspace-settings';

interface StateToProps {
    autoSave: boolean;
    autoSaveInterval: number;
    aamZoomMargin: number;
    showAllInterpolationTracks: boolean;
    showObjectsTextAlways: boolean;
    automaticBordering: boolean;
}

interface DispatchToProps {
    onSwitchAutoSave(enabled: boolean): void;
    onChangeAutoSaveInterval(interval: number): void;
    onChangeAAMZoomMargin(margin: number): void;
    onSwitchShowingInterpolatedTracks(enabled: boolean): void;
    onSwitchShowingObjectsTextAlways(enabled: boolean): void;
    onSwitchAutomaticBordering(enabled: boolean): void;
}

function mapStateToProps(state: CombinedState): StateToProps {
    const { workspace } = state.settings;
    const {
        autoSave,
        autoSaveInterval,
        aamZoomMargin,
        showAllInterpolationTracks,
        showObjectsTextAlways,
        automaticBordering,
    } = workspace;

    return {
        autoSave,
        autoSaveInterval,
        aamZoomMargin,
        showAllInterpolationTracks,
        showObjectsTextAlways,
        automaticBordering,
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
        onSwitchAutomaticBordering(enabled: boolean): void {
            dispatch(switchAutomaticBordering(enabled));
        },
    };
}

function WorkspaceSettingsContainer(props: StateToProps & DispatchToProps): JSX.Element {
    return <WorkspaceSettingsComponent {...props} />;
}

export default connect(mapStateToProps, mapDispatchToProps)(WorkspaceSettingsContainer);
