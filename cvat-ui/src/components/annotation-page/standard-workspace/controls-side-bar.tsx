import React from 'react';

import logo from '../../../../dist/assets/icon-undo.svg'

import {
    Layout,
} from 'antd';

export default function ControlsSideBarComponent() {
    return (
        <Layout.Sider
            className='cvat-annotation-page-controls-sidebar'
            theme='light'
            width={40}
        >left</Layout.Sider>
    );
}
