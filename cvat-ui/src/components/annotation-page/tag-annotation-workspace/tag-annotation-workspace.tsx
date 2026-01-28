// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React from 'react';
import Layout from 'antd/lib/layout';

import CanvasLayout from 'components/annotation-page/canvas/grid-layout/canvas-layout';
import RemoveConfirmComponent from 'components/annotation-page/standard-workspace/remove-confirm';
import TagAnnotationSidebar from './tag-annotation-sidebar/tag-annotation-sidebar';

export default function TagAnnotationWorkspace(): JSX.Element {
    return (
        <Layout hasSider className='cvat-tag-annotation-workspace'>
            <CanvasLayout />
            <TagAnnotationSidebar />
            <RemoveConfirmComponent />
        </Layout>
    );
}
