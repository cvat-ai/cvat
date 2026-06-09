// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React from 'react';
import { useSelector } from 'react-redux';
import Layout from 'antd/lib/layout';

import { CombinedState } from 'reducers';
import { shallowEqual } from 'utils/redux';
import AudioObjectsSideBar from 'audio/components/annotation-page/audio-workspace/objects-side-bar/audio-objects-side-bar';
import AudioRegionsListContainer from 'audio/containers/annotation-page/audio-workspace/audio-regions-list';
import RemoveConfirmComponent from 'components/annotation-page/standard-workspace/remove-confirm';

import AudioCanvasWrapper from './audio-canvas-wrapper';
import AudioControlsSideBarComponent from './controls-side-bar/controls-side-bar';
import AudioControlsSidebarSkeleton from './skeleton/audio-controls-sidebar-skeleton';
import AudioRegionsListSkeleton from './skeleton/audio-regions-list-skeleton';

export default function AudioWorkspaceComponent(): JSX.Element {
    const { waveformReady, audioLoading, audioError } = useSelector((state: CombinedState) => ({
        waveformReady: state.audio.player.waveformReady,
        audioLoading: state.audio.player.audioLoading,
        audioError: state.audio.player.audioError,
    }), shallowEqual);
    const showSkeleton = !audioError && (audioLoading || !waveformReady);

    return (
        <Layout hasSider className='cvat-audio-workspace'>
            {showSkeleton ? <AudioControlsSidebarSkeleton /> : <AudioControlsSideBarComponent />}
            <AudioCanvasWrapper />
            <AudioObjectsSideBar
                objectsList={showSkeleton ? <AudioRegionsListSkeleton /> : <AudioRegionsListContainer />}
                appearanceHidden={showSkeleton}
            />
            <RemoveConfirmComponent />
        </Layout>
    );
}
