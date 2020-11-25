// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React from 'react';
import Layout from 'antd/lib/layout';

import CanvasWrapperContainer from 'containers/annotation-page/standard-workspace/canvas-wrapper';
import ControlsSideBarContainer from 'containers/annotation-page/standard-workspace/controls-side-bar/controls-side-bar';
import PropagateConfirmContainer from 'containers/annotation-page/standard-workspace/propagate-confirm';
import CanvasContextMenuContainer from 'containers/annotation-page/standard-workspace/canvas-context-menu';
import ObjectSideBarComponent from 'components/annotation-page/standard-workspace/objects-side-bar/objects-side-bar';
import CanvasPointContextMenuComponent from 'components/annotation-page/standard-workspace/canvas-point-context-menu';

export default function StandardWorkspaceComponent(): JSX.Element {
    return (
        <Layout hasSider className='cvat-standard-workspace'>
            <ControlsSideBarContainer />
            <CanvasWrapperContainer />
            <ObjectSideBarComponent />
            <PropagateConfirmContainer />
            <CanvasContextMenuContainer />
            <CanvasPointContextMenuComponent />
        </Layout>
    );
}
