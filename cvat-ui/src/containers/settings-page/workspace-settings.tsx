import React from 'react';
import { connect } from 'react-redux';

import {
    CombinedState,
} from '../../reducers/interfaces';

import WorkspaceSettingsComponent from '../../components/settings-page/workspace-settings';

interface StateToProps {
    autoSave: boolean;
    autoSaveInterval: number;
    aamZoomMargin: number;
    showAllInterpolationTracks: boolean;
}

interface DispatchToProps {
    onSwitchAutoSave(enabled: boolean): void;
    onChangeAutoSaveInterval(interval: number): void;
    onChangeAAMZoomMargin(margin: number): void;
    onSwitchShowingInterpolatedTracks(enabled: boolean): void;
}

function mapStateToProps(state: CombinedState): StateToProps {
    const { workspace } = state.settings;
    const {
        autoSave,
        autoSaveInterval,
        aamZoomMargin,
        showAllInterpolationTracks,
    } = workspace;

    return {
        autoSave,
        autoSaveInterval,
        aamZoomMargin,
        showAllInterpolationTracks,
    };
}

function mapDispatchToProps(): DispatchToProps {
    return {
        // will be implemented
        // eslint-disable-next-line
        onSwitchAutoSave(enabled: boolean): void {

        },
        // will be implemented
        // eslint-disable-next-line
        onChangeAutoSaveInterval(interval: number): void {

        },
        // will be implemented
        // eslint-disable-next-line
        onChangeAAMZoomMargin(margin: number): void {

        },
        // will be implemented
        // eslint-disable-next-line
        onSwitchShowingInterpolatedTracks(enabled: boolean): void {

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
