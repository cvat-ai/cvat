// Copyright (C) 2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React from 'react';
import Layout from 'antd/lib/layout';

import CanvasLayout from 'components/annotation-page/canvas/grid-layout/canvas-layout';
import CanvasContextMenuContainer from 'containers/annotation-page/canvas/canvas-context-menu';
import RemoveConfirmComponent from 'components/annotation-page/standard-workspace/remove-confirm';
import SingleShapeSidebar from './single-shape-sidebar/single-shape-sidebar';

export default function SingleShapeWorkspace(): JSX.Element {
    return (
        <Layout hasSider className='cvat-single-shape-workspace'>
            <CanvasLayout />
            <CanvasContextMenuContainer />
            <RemoveConfirmComponent />
            <SingleShapeSidebar />
        </Layout>
    );
}
