import React from 'react';
import Layout from 'antd/lib/layout';

import { ActiveControl } from 'reducers';
import { Label } from 'cvat-core-wrapper';
import ControlVisibilityObserver, { ExtraControlsControl } from 'components/annotation-page/standard-workspace/controls-side-bar/control-visibility-observer';

import AudioCursorControl, { Props as CursorControlProps } from './cursor-control';
import CreateRegionControl, { Props as CreateRegionControlProps } from './create-region-control';
import RecordRegionControl, { Props as RecordRegionControlProps } from './record-region-control';
import EditRegionControl, { Props as EditRegionControlProps } from './edit-region-control';
import LoopControl, { Props as LoopControlProps } from './loop-control';
import ZoomControl, { Props as ZoomControlProps } from './zoom-control';
import SpeedControl, { Props as SpeedControlProps } from './speed-control';
import VolumeControl, { Props as VolumeControlProps } from './volume-control';

const ObservedCursorControl = ControlVisibilityObserver<CursorControlProps>(AudioCursorControl, 'audioCursorControl');
const ObservedCreateRegionControl = ControlVisibilityObserver<CreateRegionControlProps>(CreateRegionControl, 'audioCreateRegionControl');
const ObservedRecordRegionControl = ControlVisibilityObserver<RecordRegionControlProps>(RecordRegionControl, 'audioRecordRegionControl');
const ObservedEditRegionControl = ControlVisibilityObserver<EditRegionControlProps>(EditRegionControl, 'audioEditRegionControl');
const ObservedLoopControl = ControlVisibilityObserver<LoopControlProps>(LoopControl, 'audioLoopControl');
const ObservedZoomControl = ControlVisibilityObserver<ZoomControlProps>(ZoomControl, 'audioZoomControl');
const ObservedSpeedControl = ControlVisibilityObserver<SpeedControlProps>(SpeedControl, 'audioSpeedControl');
const ObservedVolumeControl = ControlVisibilityObserver<VolumeControlProps>(VolumeControl, 'audioVolumeControl');

export interface Props {
    activeControl: ActiveControl;
    normalizedKeyMap: Record<string, string>;
    zoom: number;
    maxZoom: number;
    volume: number;
    loop: boolean;
    playbackRate: number;
    labels: Label[];
    activeLabelId: number | null;
    updateActiveControl(activeControl: ActiveControl): void;
    onZoomChange(zoom: number): void;
    onPlaybackRateChange(rate: number): void;
    onVolumeChange(volume: number): void;
    onLoopChange(loop: boolean): void;
    onSetActiveLabel(labelId: number | null): void;
}

export default function AudioControlsSideBarComponent(props: Props): JSX.Element {
    const {
        activeControl,
        normalizedKeyMap,
        zoom,
        maxZoom,
        volume,
        loop,
        playbackRate,
        labels,
        activeLabelId,
        updateActiveControl,
        onZoomChange,
        onPlaybackRateChange,
        onVolumeChange,
        onLoopChange,
        onSetActiveLabel,
    } = props;

    return (
        <Layout.Sider className='cvat-canvas-controls-sidebar' theme='light' width={44}>
            <ObservedCursorControl
                cursorShortkey={normalizedKeyMap.CANCEL_AUDIO}
                activeControl={activeControl}
                updateActiveControl={updateActiveControl}
            />
            <ObservedCreateRegionControl
                activeControl={activeControl}
                createRegionShortkey={normalizedKeyMap.CREATE_AUDIO_REGION}
                labels={labels}
                activeLabelId={activeLabelId}
                updateActiveControl={updateActiveControl}
                onSetActiveLabel={onSetActiveLabel}
            />
            <ObservedRecordRegionControl
                activeControl={activeControl}
                recordRegionShortkey={normalizedKeyMap.RECORD_AUDIO_REGION}
                labels={labels}
                activeLabelId={activeLabelId}
                updateActiveControl={updateActiveControl}
                onSetActiveLabel={onSetActiveLabel}
            />
            <ObservedEditRegionControl
                activeControl={activeControl}
                editRegionShortkey={normalizedKeyMap.EDIT_AUDIO_REGION}
                updateActiveControl={updateActiveControl}
            />
            <div className='cvat-audio-controls-divider' />
            <ObservedLoopControl
                loop={loop}
                onLoopChange={onLoopChange}
            />
            <ObservedZoomControl
                zoom={zoom}
                maxZoom={maxZoom}
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
