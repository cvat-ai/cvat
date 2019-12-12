import React from 'react';

import {
    Layout,
} from 'antd';

import AnnotationTopBarComponent from './top-bar/top-bar';
import StandardWorkspaceComponent from './standard-workspace/standard-workspace';

export default function AnnotationPageComponent() {
    return (
        <Layout className='cvat-annotation-page'>
            <AnnotationTopBarComponent/>
            <StandardWorkspaceComponent/>
        </Layout>
    );
}
