// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React from 'react';
import Layout from 'antd/lib/layout';

import CanvasLayout from 'components/annotation-page/canvas/grid-layout/canvas-layout';
import AttributeAnnotationSidebar from './attribute-annotation-sidebar/attribute-annotation-sidebar';

export default function AttributeAnnotationWorkspace(): JSX.Element {
    return (
        <Layout hasSider className='attribute-annotation-workspace'>
            <CanvasLayout />
            <AttributeAnnotationSidebar />
        </Layout>
    );
}
