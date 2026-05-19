import './styles.scss';
import React from 'react';
import Layout from 'antd/lib/layout';

import AudioCanvasWrapperContainer from 'containers/annotation-page/audio-workspace/audio-canvas-wrapper';
import ControlsSideBarContainer from 'containers/annotation-page/audio-workspace/controls-side-bar/controls-side-bar';
import AudioObjectsSideBar from 'components/annotation-page/audio-workspace/objects-side-bar/audio-objects-side-bar';
import AudioRegionsListContainer from 'containers/annotation-page/audio-workspace/audio-regions-list';
import RemoveConfirmComponent from 'components/annotation-page/standard-workspace/remove-confirm';
import { useAudioAnnotationsEnabled } from 'utils/feature-flags';

import AudioControlsSidebarSkeleton from './skeleton/audio-controls-sidebar-skeleton';
import AudioRegionsListSkeleton from './skeleton/audio-regions-list-skeleton';

export interface AudioWorkspaceProps {
    waveformReady: boolean;
    audioLoading: boolean;
    audioError: string | null;
}

export default function AudioWorkspaceComponent(props: AudioWorkspaceProps): JSX.Element | null {
    const audioEnabled = useAudioAnnotationsEnabled();
    if (!audioEnabled) {
        return null;
    }

    const { waveformReady, audioLoading, audioError } = props;
    const showSkeleton = !audioError && (audioLoading || !waveformReady);

    return (
        <Layout hasSider className='cvat-audio-workspace'>
            {showSkeleton ? <AudioControlsSidebarSkeleton /> : <ControlsSideBarContainer />}
            <AudioCanvasWrapperContainer />
            <AudioObjectsSideBar
                objectsList={showSkeleton ? <AudioRegionsListSkeleton /> : <AudioRegionsListContainer />}
                appearanceHidden={showSkeleton}
            />
            <RemoveConfirmComponent />
        </Layout>
    );
}
