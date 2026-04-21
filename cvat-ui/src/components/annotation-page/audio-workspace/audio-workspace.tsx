import './styles.scss';
import React from 'react';
import Layout from 'antd/lib/layout';

import AudioCanvasWrapperContainer from 'containers/annotation-page/audio-workspace/audio-canvas-wrapper';
import ControlsSideBarContainer from 'containers/annotation-page/audio-workspace/controls-side-bar/controls-side-bar';
import ObjectSideBarComponent from 'components/annotation-page/standard-workspace/objects-side-bar/objects-side-bar';
import AudioRegionsListContainer from 'containers/annotation-page/audio-workspace/audio-regions-list';
import RemoveConfirmComponent from 'components/annotation-page/standard-workspace/remove-confirm';

export interface AudioWorkspaceProps {
    waveformReady: boolean;
}

export default function AudioWorkspaceComponent({ waveformReady }: AudioWorkspaceProps): JSX.Element {
    return (
        <Layout hasSider className='cvat-audio-workspace'>
            {waveformReady && <ControlsSideBarContainer />}
            <AudioCanvasWrapperContainer />
            <ObjectSideBarComponent objectsList={<AudioRegionsListContainer />} />
            <RemoveConfirmComponent />
        </Layout>
    );
}
