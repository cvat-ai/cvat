import React from 'react';

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
