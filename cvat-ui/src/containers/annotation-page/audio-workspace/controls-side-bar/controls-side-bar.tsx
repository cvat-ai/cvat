import { connect } from 'react-redux';
import { Dispatch } from 'redux';

import ControlsSideBarComponent from 'components/annotation-page/audio-workspace/controls-side-bar/controls-side-bar';
import { computeMaxZoom } from 'components/annotation-page/audio-workspace/utils/zoom-bounds';
import { ActiveControl, CombinedState } from 'reducers';
import { Label } from 'cvat-core-wrapper';
import {
    updateActiveControl,
    setAudioZoom,
    setAudioPlaybackRate,
    setAudioVolume,
    setAudioLoop,
    setAudioActiveLabel,
} from 'actions/annotation-actions';

interface StateToProps {
    activeControl: ActiveControl;
    normalizedKeyMap: Record<string, string>;
    zoom: number;
    maxZoom: number;
    volume: number;
    loop: boolean;
    playbackRate: number;
    labels: Label[];
    activeLabelId: number | null;
}

interface DispatchToProps {
    updateActiveControl(activeControl: ActiveControl): void;
    onZoomChange(zoom: number): void;
    onPlaybackRateChange(rate: number): void;
    onVolumeChange(volume: number): void;
    onLoopChange(loop: boolean): void;
    onSetActiveLabel(labelId: number | null): void;
}

function mapStateToProps(state: CombinedState): StateToProps {
    const {
        annotation: {
            canvas: { activeControl },
            audioPlayer: {
                zoom, volume, loop, playbackRate, duration,
            },
        },
        shortcuts: { normalizedKeyMap },
    } = state;

    return {
        activeControl,
        normalizedKeyMap,
        zoom,
        maxZoom: computeMaxZoom(duration),
        volume,
        loop,
        playbackRate,
        labels: state.annotation.job.labels,
        activeLabelId: state.annotation.audioPlayer.activeLabelId,
    };
}

function mapDispatchToProps(dispatch: Dispatch): DispatchToProps {
    return {
        updateActiveControl(activeControl: ActiveControl): void {
            dispatch(updateActiveControl(activeControl));
        },
        onZoomChange(zoom: number): void {
            dispatch(setAudioZoom(zoom));
        },
        onPlaybackRateChange(rate: number): void {
            dispatch(setAudioPlaybackRate(rate));
        },
        onVolumeChange(volume: number): void {
            dispatch(setAudioVolume(volume));
        },
        onLoopChange(loop: boolean): void {
            dispatch(setAudioLoop(loop));
        },
        onSetActiveLabel(labelId: number | null): void {
            dispatch(setAudioActiveLabel(labelId));
        },
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(ControlsSideBarComponent);
