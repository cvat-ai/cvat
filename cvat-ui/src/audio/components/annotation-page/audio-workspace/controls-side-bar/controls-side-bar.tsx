// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Layout from 'antd/lib/layout';

import { ActiveControl, CombinedState } from 'reducers';
import { shallowEqual, ThunkDispatch } from 'utils/redux';
import { updateActiveControl } from 'actions/annotation-actions';
import {
    audioActions,
    extendAudioIntervalFromLastAsync,
} from 'actions/audio-actions';
import ControlVisibilityObserver, { ExtraControlsControl } from 'components/annotation-page/standard-workspace/controls-side-bar/control-visibility-observer';

import AudioCursorControl, { Props as CursorControlProps } from './cursor-control';
import IntervalRegionControl, { Props as IntervalRegionControlProps } from './interval-region-control';
import EditRegionControl, { Props as EditRegionControlProps } from './edit-region-control';
import LoopControl, { Props as LoopControlProps } from './loop-control';
import ZoomControl, { Props as ZoomControlProps } from './zoom-control';
import SpeedControl, { Props as SpeedControlProps } from './speed-control';
import VolumeControl, { Props as VolumeControlProps } from './volume-control';

const ObservedCursorControl = ControlVisibilityObserver<CursorControlProps>(AudioCursorControl, 'audioCursorControl');
const ObservedIntervalRegionControl = ControlVisibilityObserver<IntervalRegionControlProps>(IntervalRegionControl, 'audioIntervalRegionControl');
const ObservedEditRegionControl = ControlVisibilityObserver<EditRegionControlProps>(EditRegionControl, 'audioEditRegionControl');
const ObservedLoopControl = ControlVisibilityObserver<LoopControlProps>(LoopControl, 'audioLoopControl');
const ObservedZoomControl = ControlVisibilityObserver<ZoomControlProps>(ZoomControl, 'audioZoomControl');
const ObservedSpeedControl = ControlVisibilityObserver<SpeedControlProps>(SpeedControl, 'audioSpeedControl');
const ObservedVolumeControl = ControlVisibilityObserver<VolumeControlProps>(VolumeControl, 'audioVolumeControl');

export default function AudioControlsSideBarComponent(): JSX.Element {
    const dispatch = useDispatch<ThunkDispatch>();
    const {
        activeControl,
        normalizedKeyMap,
        zoom,
        volume,
        loop,
        playbackRate,
        labels,
        activeLabelId,
    } = useSelector((state: CombinedState) => ({
        activeControl: state.annotation.canvas.activeControl,
        normalizedKeyMap: state.shortcuts.normalizedKeyMap,
        zoom: state.audio.player.zoom,
        volume: state.audio.player.volume,
        loop: state.audio.player.loop,
        playbackRate: state.audio.player.playbackRate,
        labels: state.annotation.job.labels,
        activeLabelId: state.audio.player.activeLabelId,
    }), shallowEqual);

    const updateAudioActiveControl = useCallback((control: ActiveControl): void => {
        dispatch(updateActiveControl(control));
    }, [dispatch]);
    const onZoomChange = useCallback((nextZoom: number): void => {
        dispatch(audioActions.setAudioZoom(nextZoom));
    }, [dispatch]);
    const onPlaybackRateChange = useCallback((rate: number): void => {
        dispatch(audioActions.setAudioPlaybackRate(rate));
    }, [dispatch]);
    const onVolumeChange = useCallback((nextVolume: number): void => {
        dispatch(audioActions.setAudioVolume(nextVolume));
    }, [dispatch]);
    const onLoopChange = useCallback((nextLoop: boolean): void => {
        dispatch(audioActions.setAudioLoop(nextLoop));
    }, [dispatch]);
    const onSetActiveLabel = useCallback((labelId: number | null): void => {
        dispatch(audioActions.setAudioActiveLabel(labelId));
    }, [dispatch]);
    const onExtendRegion = useCallback((labelId: number): void => {
        dispatch(extendAudioIntervalFromLastAsync(labelId));
    }, [dispatch]);

    return (
        <Layout.Sider className='cvat-canvas-controls-sidebar' theme='light' width={44}>
            <ObservedCursorControl
                cursorShortkey={normalizedKeyMap.CANCEL_AUDIO}
                activeControl={activeControl}
                updateActiveControl={updateAudioActiveControl}
            />
            <ObservedEditRegionControl
                activeControl={activeControl}
                editRegionShortkey={normalizedKeyMap.EDIT_AUDIO_REGION}
                updateActiveControl={updateAudioActiveControl}
            />
            <hr />
            <ObservedIntervalRegionControl
                activeControl={activeControl}
                createRegionShortkey={normalizedKeyMap.CREATE_AUDIO_REGION}
                recordRegionShortkey={normalizedKeyMap.RECORD_AUDIO_REGION}
                extendRegionShortkey={normalizedKeyMap.EXTEND_AUDIO_REGION_FROM_LAST}
                labels={labels}
                activeLabelId={activeLabelId}
                onExtendRegion={onExtendRegion}
                onSetActiveLabel={onSetActiveLabel}
                updateActiveControl={updateAudioActiveControl}
            />
            <hr />
            <ObservedLoopControl
                loop={loop}
                onLoopChange={onLoopChange}
            />
            <hr />
            <ObservedZoomControl
                zoom={zoom}
                onZoomChange={onZoomChange}
            />
            <ObservedVolumeControl
                volume={volume}
                onVolumeChange={onVolumeChange}
            />
            <ObservedSpeedControl
                playbackRate={playbackRate}
                onPlaybackRateChange={onPlaybackRateChange}
            />
            <ExtraControlsControl />
        </Layout.Sider>
    );
}
