// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { connect } from 'react-redux';

import AudioContextMenuComponent from 'audio/components/annotation-page/audio-workspace/audio-context-menu-component';
import {
    copyAudioIntervalURL,
    intervalID,
} from 'audio/components/annotation-page/audio-workspace/utils/audio-interval';
import { ColorBy, CombinedState } from 'reducers';
import {
    audioActions,
    copyAudioIntervalAsync,
    removeAudioIntervalAsync,
    updateAudioIntervalAsync,
} from 'actions/audio-actions';
import { AudioIntervalState } from 'cvat-core-wrapper';
import { ThunkDispatch } from 'utils/redux';

interface StateToProps {
    interval: AudioIntervalState | null;
    visible: boolean;
    top: number;
    left: number;
    colorBy: ColorBy;
}

interface DispatchToProps {
    onCloseContextMenu(): void;
    onCreateURL(interval: AudioIntervalState): void;
    onCopyInterval(clientID: number): void;
    onDeleteInterval(clientID: number): void;
    onChangeIntervalColor(clientID: number, color: string): void;
}

function mapStateToProps(state: CombinedState): StateToProps {
    const {
        visible, top, left, clientID,
    } = state.audio.player.contextMenu;
    const interval = clientID !== null ?
        state.audio.player.intervals.find((_interval) => _interval.clientID === clientID) ?? null :
        null;

    return {
        interval,
        visible: visible && !!interval,
        top,
        left,
        colorBy: state.settings.shapes.colorBy,
    };
}

function mapDispatchToProps(dispatch: ThunkDispatch): DispatchToProps {
    return {
        onCloseContextMenu(): void {
            dispatch(audioActions.updateAudioContextMenu(false, 0, 0));
        },
        onCreateURL(interval: AudioIntervalState): void {
            copyAudioIntervalURL(interval.serverID);
        },
        onCopyInterval(clientID: number): void {
            dispatch(copyAudioIntervalAsync(clientID));
        },
        onDeleteInterval(clientID: number): void {
            dispatch(removeAudioIntervalAsync(clientID));
        },
        onChangeIntervalColor(clientID: number, color: string): void {
            dispatch(updateAudioIntervalAsync(clientID, { color }));
        },
    };
}

type Props = StateToProps & DispatchToProps;

function AudioContextMenuContainer(props: Props): JSX.Element | null {
    const {
        interval,
        visible,
        top,
        left,
        colorBy,
        onCloseContextMenu,
        onCreateURL,
        onCopyInterval,
        onDeleteInterval,
        onChangeIntervalColor,
    } = props;

    const clientID = interval ? intervalID(interval) : null;

    return (
        <AudioContextMenuComponent
            interval={interval}
            visible={visible}
            top={top}
            left={left}
            colorBy={colorBy}
            onCloseContextMenu={onCloseContextMenu}
            onCreateURL={() => {
                if (interval) onCreateURL(interval);
            }}
            onCopyInterval={() => {
                if (clientID !== null) onCopyInterval(clientID);
            }}
            onDeleteInterval={() => {
                if (clientID !== null) onDeleteInterval(clientID);
            }}
            onChangeIntervalColor={(color: string) => {
                if (clientID !== null) onChangeIntervalColor(clientID, color);
            }}
        />
    );
}

export default connect(mapStateToProps, mapDispatchToProps)(AudioContextMenuContainer);
