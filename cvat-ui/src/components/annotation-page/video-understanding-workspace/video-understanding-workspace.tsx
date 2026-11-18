// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React, { useState } from 'react';
import Layout from 'antd/lib/layout';
import { useSelector } from 'react-redux';
import { CombinedState } from 'reducers';

import CanvasLayout from 'components/annotation-page/canvas/grid-layout/canvas-layout';
import RemoveConfirmComponent from 'components/annotation-page/standard-workspace/remove-confirm';
import ActionPhases, { phasePanelHeight } from './action-phases';

export default function VideoUnderstandingWorkspace(): JSX.Element {
    const job = useSelector((state: CombinedState) => state.annotation.job.instance);
    const defaultTags = useSelector((state: CombinedState) => state.settings.workspace.showTagsOnFrame);
    const [showObjects, setShowObjects] = useState(() => localStorage.getItem('cvat-video-objects') !== 'off');
    const [showTags, setShowTags] = useState(() => {
        const preference = localStorage.getItem('cvat-video-frame-tags');
        return preference === null ? defaultTags : preference === 'on';
    });

    return (
        <Layout hasSider className='cvat-video-understanding-workspace'>
            <div className='cvat-video-workspace-content'>
                <CanvasLayout
                    bottomInset={phasePanelHeight}
                    showObjectOverlays={showObjects}
                    showFrameTagOverlays={showTags}
                />
                <ActionPhases
                    key={job.id}
                    job={job}
                    showObjects={showObjects}
                    showTags={showTags}
                    onShowObjects={(enabled) => {
                        setShowObjects(enabled);
                        localStorage.setItem('cvat-video-objects', enabled ? 'on' : 'off');
                    }}
                    onShowTags={(enabled) => {
                        setShowTags(enabled);
                        localStorage.setItem('cvat-video-frame-tags', enabled ? 'on' : 'off');
                    }}
                />
            </div>
            <RemoveConfirmComponent />
        </Layout>
    );
}
