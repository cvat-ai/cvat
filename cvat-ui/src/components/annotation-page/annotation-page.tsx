import './styles.scss';
import React from 'react';

import {
    Layout,
} from 'antd';

import AnnotationTopBarComponent from './top-bar/top-bar';
import StandardWorkspaceComponent from './standard-workspace/standard-workspace';

export default function AnnotationPageComponent(): JSX.Element {
    return (
        <Layout className='cvat-annotation-page'>
            <AnnotationTopBarComponent />
            <StandardWorkspaceComponent />
        </Layout>
    );
}
