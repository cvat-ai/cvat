// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import AudioContextMenuComponent from 'audio/components/annotation-page/audio-workspace/audio-context-menu-component';
import {
    copyAudioIntervalURL,
    intervalID,
} from 'audio/components/annotation-page/audio-workspace/utils/audio-interval';
import { CombinedState } from 'reducers';
import {
    audioActions,
    copyAudioIntervalAsync,
    removeAudioIntervalAsync,
    updateAudioIntervalAsync,
} from 'actions/audio-actions';
import { shallowEqual, ThunkDispatch } from 'utils/redux';

function AudioContextMenuWrapper(): JSX.Element | null {
    const dispatch = useDispatch<ThunkDispatch>();
    const {
        interval, top, left, colorBy,
    } = useSelector((state: CombinedState) => {
        const {
            top: contextMenuTop,
            left: contextMenuLeft,
            clientID,
        } = state.audio.player.contextMenu;
        const contextMenuInterval = clientID !== null ?
            state.audio.player.intervals.find((_interval) => _interval.clientID === clientID) ?? null :
            null;

        return {
            interval: contextMenuInterval,
            top: contextMenuTop,
            left: contextMenuLeft,
            colorBy: state.settings.shapes.colorBy,
        };
    }, shallowEqual);

    const clientID = interval ? intervalID(interval) : null;
    const serverID = interval?.serverID;

    const onCloseContextMenu = useCallback((): void => {
        dispatch(audioActions.updateAudioContextMenu(0, 0, null));
    }, [dispatch]);

    const onCreateURL = useCallback((): void => {
        copyAudioIntervalURL(serverID);
    }, [serverID]);

    const onCopyInterval = useCallback((): void => {
        if (!clientID) {
            return;
        }

        dispatch(copyAudioIntervalAsync(clientID));
    }, [clientID, dispatch]);

    const onDeleteInterval = useCallback((): void => {
        if (!clientID) {
            return;
        }

        dispatch(removeAudioIntervalAsync(clientID));
    }, [clientID, dispatch]);

    const onChangeIntervalColor = useCallback((color: string): void => {
        if (!clientID) {
            return;
        }

        dispatch(updateAudioIntervalAsync(clientID, { color }));
    }, [clientID, dispatch]);

    if (!interval) {
        return null;
    }

    return (
        <AudioContextMenuComponent
            interval={interval}
            top={top}
            left={left}
            colorBy={colorBy}
            onCloseContextMenu={onCloseContextMenu}
            onCreateURL={onCreateURL}
            onCopyInterval={onCopyInterval}
            onDeleteInterval={onDeleteInterval}
            onChangeIntervalColor={onChangeIntervalColor}
        />
    );
}

export default AudioContextMenuWrapper;
