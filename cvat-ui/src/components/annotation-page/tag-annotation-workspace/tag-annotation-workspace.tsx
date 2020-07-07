// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React from 'react';
import Layout from 'antd/lib/layout';

import CanvasWrapperContainer from 'containers/annotation-page/standard-workspace/canvas-wrapper';
import TagAnnotationSidebar from './tag-annotation-sidebar/tag-annotation-sidebar';

export default function TagAnnotationWorkspace(): JSX.Element {
    return (
        <Layout hasSider className='cvat-tag-annotation-workspace'>
            <CanvasWrapperContainer />
            <TagAnnotationSidebar />
        </Layout>
    );
}
