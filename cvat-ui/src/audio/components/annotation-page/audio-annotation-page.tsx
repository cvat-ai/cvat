// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import Layout from 'antd/lib/layout';

import AudioWorkspaceComponent from 'audio/components/annotation-page/audio-workspace/audio-workspace';
import AudioFiltersModalComponent from 'audio/components/annotation-page/audio-workspace/top-bar/audio-filters-modal';
import AudioStatisticsModalComponent from 'audio/components/annotation-page/audio-workspace/top-bar/audio-statistics-modal';
import AudioTopBarContainer from 'audio/containers/annotation-page/audio-workspace/top-bar/audio-top-bar';

export default function AudioAnnotationPage(): JSX.Element {
    return (
        <Layout className='cvat-annotation-page'>
            <Layout.Header className='cvat-annotation-header'>
                <AudioTopBarContainer />
            </Layout.Header>
            <Layout.Content className='cvat-annotation-layout-content'>
                <AudioWorkspaceComponent />
            </Layout.Content>
            <AudioFiltersModalComponent />
            <AudioStatisticsModalComponent />
        </Layout>
    );
}
