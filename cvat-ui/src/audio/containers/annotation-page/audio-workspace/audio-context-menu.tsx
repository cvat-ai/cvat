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
        top, left, clientID,
    } = state.audio.player.contextMenu;
    const interval = clientID !== null ?
        state.audio.player.intervals.find((_interval) => _interval.clientID === clientID) ?? null :
        null;

    return {
        interval,
        top,
        left,
        colorBy: state.settings.shapes.colorBy,
    };
}

function mapDispatchToProps(dispatch: ThunkDispatch): DispatchToProps {
    return {
        onCloseContextMenu(): void {
            dispatch(audioActions.updateAudioContextMenu(0, 0, null));
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
        top,
        left,
        colorBy,
        onCloseContextMenu,
        onCreateURL,
        onCopyInterval,
        onDeleteInterval,
        onChangeIntervalColor,
    } = props;

    if (!interval) {
        return null;
    }

    const clientID = intervalID(interval);

    return (
        <AudioContextMenuComponent
            interval={interval}
            top={top}
            left={left}
            colorBy={colorBy}
            onCloseContextMenu={onCloseContextMenu}
            onCreateURL={() => onCreateURL(interval)}
            onCopyInterval={() => onCopyInterval(clientID)}
            onDeleteInterval={() => onDeleteInterval(clientID)}
            onChangeIntervalColor={(color: string) => onChangeIntervalColor(clientID, color)}
        />
    );
}

export default connect(mapStateToProps, mapDispatchToProps)(AudioContextMenuContainer);
