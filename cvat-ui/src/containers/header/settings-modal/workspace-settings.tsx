// Copyright (C) 2020-2022 Intel Corporation
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
    switchIntelligentPolygonCrop,
    changeDefaultApproxPolyAccuracy,
    switchTextFontSize,
    switchControlPointsSize,
    switchTextPosition,
    switchTextContent,
    switchShowingTagsOnFrame,
} from 'actions/settings-actions';

import { CombinedState } from 'reducers';

import WorkspaceSettingsComponent from 'components/header/settings-modal/workspace-settings';

interface StateToProps {
    autoSave: boolean;
    autoSaveInterval: number;
    aamZoomMargin: number;
    showAllInterpolationTracks: boolean;
    showObjectsTextAlways: boolean;
    defaultApproxPolyAccuracy: number;
    automaticBordering: boolean;
    intelligentPolygonCrop: boolean;
    textFontSize: number;
    controlPointsSize: number;
    textPosition: 'auto' | 'center';
    textContent: string;
    showTagsOnFrame: boolean;
}

interface DispatchToProps {
    onSwitchAutoSave(enabled: boolean): void;
    onChangeAutoSaveInterval(interval: number): void;
    onChangeAAMZoomMargin(margin: number): void;
    onSwitchShowingInterpolatedTracks(enabled: boolean): void;
    onSwitchShowingObjectsTextAlways(enabled: boolean): void;
    onSwitchAutomaticBordering(enabled: boolean): void;
    onSwitchIntelligentPolygonCrop(enabled: boolean): void;
    onChangeDefaultApproxPolyAccuracy(approxPolyAccuracy: number): void;
    onChangeTextFontSize(fontSize: number): void;
    onChangeControlPointsSize(pointsSize: number): void;
    onChangeTextPosition(position: 'auto' | 'center'): void;
    onChangeTextContent(textContent: string[]): void;
    onSwitchShowingTagsOnFrame(enabled: boolean): void;
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
        intelligentPolygonCrop,
        defaultApproxPolyAccuracy,
        textFontSize,
        controlPointsSize,
        textPosition,
        textContent,
        showTagsOnFrame,
    } = workspace;

    return {
        autoSave,
        autoSaveInterval,
        aamZoomMargin,
        showAllInterpolationTracks,
        showObjectsTextAlways,
        automaticBordering,
        intelligentPolygonCrop,
        defaultApproxPolyAccuracy,
        textFontSize,
        controlPointsSize,
        textPosition,
        textContent,
        showTagsOnFrame,
    };
}

const mapDispatchToProps: DispatchToProps = {
    onSwitchAutoSave: switchAutoSave,
    onChangeAutoSaveInterval: changeAutoSaveInterval,
    onChangeAAMZoomMargin: changeAAMZoomMargin,
    onSwitchShowingInterpolatedTracks: switchShowingInterpolatedTracks,
    onSwitchShowingObjectsTextAlways: switchShowingObjectsTextAlways,
    onSwitchAutomaticBordering: switchAutomaticBordering,
    onSwitchIntelligentPolygonCrop: switchIntelligentPolygonCrop,
    onChangeDefaultApproxPolyAccuracy: changeDefaultApproxPolyAccuracy,
    onChangeTextFontSize: switchTextFontSize,
    onChangeControlPointsSize: switchControlPointsSize,
    onChangeTextPosition: switchTextPosition,
    onChangeTextContent: switchTextContent,
    onSwitchShowingTagsOnFrame: switchShowingTagsOnFrame,
};

function WorkspaceSettingsContainer(props: StateToProps & DispatchToProps): JSX.Element {
    return <WorkspaceSettingsComponent {...props} />;
}

export default connect(mapStateToProps, mapDispatchToProps)(WorkspaceSettingsContainer);
