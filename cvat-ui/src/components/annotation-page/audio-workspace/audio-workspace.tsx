import './styles.scss';
import React from 'react';
import Layout from 'antd/lib/layout';

import AudioCanvasWrapperContainer from 'containers/annotation-page/audio-workspace/audio-canvas-wrapper';
import ControlsSideBarContainer from 'containers/annotation-page/audio-workspace/controls-side-bar/controls-side-bar';
import ObjectSideBarComponent from 'components/annotation-page/standard-workspace/objects-side-bar/objects-side-bar';
import AudioRegionsListContainer from 'containers/annotation-page/audio-workspace/audio-regions-list';
import RemoveConfirmComponent from 'components/annotation-page/standard-workspace/remove-confirm';

import AudioControlsSidebarSkeleton from './skeleton/audio-controls-sidebar-skeleton';
import AudioRegionsListSkeleton from './skeleton/audio-regions-list-skeleton';

export interface AudioWorkspaceProps {
    waveformReady: boolean;
    audioLoading: boolean;
    audioError: string | null;
}

export default function AudioWorkspaceComponent(props: AudioWorkspaceProps): JSX.Element {
    const { waveformReady, audioLoading, audioError } = props;
    const showSkeleton = !audioError && (audioLoading || !waveformReady);

    return (
        <Layout hasSider className='cvat-audio-workspace'>
            {showSkeleton ? <AudioControlsSidebarSkeleton /> : <ControlsSideBarContainer />}
            <AudioCanvasWrapperContainer />
            <ObjectSideBarComponent
                objectsList={showSkeleton ? <AudioRegionsListSkeleton /> : <AudioRegionsListContainer />}
                appearanceHidden={showSkeleton}
            />
            <RemoveConfirmComponent />
        </Layout>
    );
}
