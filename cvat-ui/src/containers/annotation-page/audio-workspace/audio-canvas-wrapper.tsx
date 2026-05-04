import { connect } from 'react-redux';
import { Dispatch } from 'redux';

import AudioCanvasWrapper from 'components/annotation-page/audio-workspace/audio-canvas-wrapper';
import { filterAudioRegions } from 'components/annotation-page/audio-workspace/utils/filter-audio-regions';
import {
    ActiveControl, AudioRegion, ColorBy, CombinedState,
} from 'reducers';
import { Label } from 'cvat-core-wrapper';
import {
    switchAudioPlay,
    setAudioCurrentTime,
    setAudioDuration,
    setAudioRegions,
    setAudioActiveRegion,
    setAudioHoveredRegion,
    setAudioZoom,
    updateAudioRegionAttribute,
    setWaveformReady,
    updateActiveControl,
} from 'actions/annotation-actions';

interface StateToProps {
    isPlaying: boolean;
    currentTime: number;
    duration: number;
    zoom: number;
    volume: number;
    loop: boolean;
    playbackRate: number;
    activeControl: CombinedState['annotation']['canvas']['activeControl'];
    regions: AudioRegion[];
    visibleRegionIds: Set<string>;
    activeRegionId: string | null;
    hoveredRegionId: string | null;
    audioUrl: string | null;
    audioLoading: boolean;
    audioError: string | null;
    waveformReady: boolean;
    labels: Label[];
    activeLabelId: number | null;
    colorBy: ColorBy;
    opacity: number;
    selectedOpacity: number;
}

interface DispatchToProps {
    onSwitchPlay(playing: boolean): void;
    onSetCurrentTime(time: number): void;
    onSetDuration(duration: number): void;
    onSetRegions(regions: AudioRegion[]): void;
    onSetActiveRegion(regionId: string | null): void;
    onSetHoveredRegion(regionId: string | null): void;
    onSetZoom(zoom: number): void;
    onUpdateRegionAttribute(regionId: string, attrID: number, value: string): void;
    onWaveformReady(ready: boolean): void;
    onUpdateActiveControl(activeControl: ActiveControl): void;
}

function mapStateToProps(state: CombinedState): StateToProps {
    const { audioPlayer } = state.annotation;
    const { labels } = state.annotation.job;
    const { filters } = state.annotation.annotations;
    const visibleRegionIds = new Set(
        filterAudioRegions(audioPlayer.regions, labels, filters).map((r) => r.id),
    );
    return {
        isPlaying: audioPlayer.playing,
        currentTime: audioPlayer.currentTime,
        duration: audioPlayer.duration,
        zoom: audioPlayer.zoom,
        volume: audioPlayer.volume,
        loop: audioPlayer.loop,
        playbackRate: audioPlayer.playbackRate,
        activeControl: state.annotation.canvas.activeControl,
        regions: audioPlayer.regions,
        visibleRegionIds,
        activeRegionId: audioPlayer.activeRegionId,
        hoveredRegionId: audioPlayer.hoveredRegionId,
        audioUrl: audioPlayer.audioUrl,
        audioLoading: audioPlayer.audioLoading,
        audioError: audioPlayer.audioError,
        waveformReady: audioPlayer.waveformReady,
        labels,
        activeLabelId: audioPlayer.activeLabelId,
        colorBy: state.settings.shapes.colorBy,
        opacity: state.settings.shapes.opacity,
        selectedOpacity: state.settings.shapes.selectedOpacity,
    };
}

function mapDispatchToProps(dispatch: Dispatch): DispatchToProps {
    return {
        onSwitchPlay(playing: boolean): void {
            dispatch(switchAudioPlay(playing));
        },
        onSetCurrentTime(time: number): void {
            dispatch(setAudioCurrentTime(time));
        },
        onSetDuration(duration: number): void {
            dispatch(setAudioDuration(duration));
        },
        onSetRegions(regions: AudioRegion[]): void {
            dispatch(setAudioRegions(regions));
        },
        onSetActiveRegion(regionId: string | null): void {
            dispatch(setAudioActiveRegion(regionId));
        },
        onSetHoveredRegion(regionId: string | null): void {
            dispatch(setAudioHoveredRegion(regionId));
        },
        onSetZoom(zoom: number): void {
            dispatch(setAudioZoom(zoom));
        },
        onUpdateRegionAttribute(regionId: string, attrID: number, value: string): void {
            dispatch(updateAudioRegionAttribute(regionId, attrID, value));
        },
        onWaveformReady(ready: boolean): void {
            dispatch(setWaveformReady(ready));
        },
        onUpdateActiveControl(activeControl: ActiveControl): void {
            dispatch(updateActiveControl(activeControl));
        },
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(AudioCanvasWrapper);
