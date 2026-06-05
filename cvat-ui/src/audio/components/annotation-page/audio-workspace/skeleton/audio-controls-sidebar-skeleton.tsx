// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import Layout from 'antd/lib/layout';

const CONTROL_PLACEHOLDERS = 7;

export default function AudioControlsSidebarSkeleton(): JSX.Element {
    return (
        <Layout.Sider
            className='cvat-canvas-controls-sidebar cvat-audio-skeleton-sidebar'
            theme='light'
            width={44}
        >
            {Array.from({ length: CONTROL_PLACEHOLDERS }, (_, i) => (
                <div key={i} className='cvat-audio-skeleton-control' />
            ))}
        </Layout.Sider>
    );
}
