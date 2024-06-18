// Copyright (C) 2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React from 'react';
import Layout from 'antd/lib/layout';

import CanvasLayout from 'components/annotation-page/canvas/grid-layout/canvas-layout';
import SingleShapeSidebar from './single-shape-sidebar/single-shape-sidebar';

export default function SingleShapeWorkspace(): JSX.Element {
    return (
        <Layout hasSider className='cvat-single-shape-workspace'>
            <CanvasLayout />
            <SingleShapeSidebar />
        </Layout>
    );
}
