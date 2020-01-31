import './styles.scss';
import React from 'react';

import {
    Icon,
    Tabs,
    Layout,
    Collapse,
} from 'antd';

import Text from 'antd/lib/typography/Text';

import ObjectsListContainer from 'containers/annotation-page/standard-workspace/objects-side-bar/objects-list';
import LabelsListContainer from 'containers/annotation-page/standard-workspace/objects-side-bar/labels-list';

interface Props {
    sidebarCollapsed: boolean;
    appearanceCollapsed: boolean;
    collapseSidebar(): void;
    collapseAppearance(): void;
}

const ObjectsSideBar = React.memo((props: Props): JSX.Element => {
    const {
        sidebarCollapsed,
        appearanceCollapsed,
        collapseSidebar,
        collapseAppearance,
    } = props;

    return (
        <Layout.Sider
            className='cvat-objects-sidebar'
            theme='light'
            width={300}
            collapsedWidth={0}
            reverseArrow
            collapsible
            trigger={null}
            collapsed={sidebarCollapsed}
        >
            {/* eslint-disable-next-line */}
            <span
                className={`cvat-objects-sidebar-sider
                    ant-layout-sider-zero-width-trigger
                    ant-layout-sider-zero-width-trigger-left`}
                onClick={collapseSidebar}
            >
                {sidebarCollapsed ? <Icon type='menu-fold' title='Show' />
                    : <Icon type='menu-unfold' title='Hide' />}
            </span>

            <Tabs type='card' defaultActiveKey='objects' className='cvat-objects-sidebar-tabs'>
                <Tabs.TabPane
                    tab={<Text strong>Objects</Text>}
                    key='objects'
                >
                    <ObjectsListContainer />
                </Tabs.TabPane>
                <Tabs.TabPane
                    tab={<Text strong>Labels</Text>}
                    key='labels'
                >
                    <LabelsListContainer />
                </Tabs.TabPane>
            </Tabs>

            <Collapse
                onChange={collapseAppearance}
                activeKey={appearanceCollapsed ? [] : ['appearance']}
                className='cvat-objects-appearance-collapse'
            >
                <Collapse.Panel
                    header={
                        <Text strong>Appearance</Text>
                    }
                    key='appearance'
                >

                </Collapse.Panel>
            </Collapse>
        </Layout.Sider>
    );
});

export default ObjectsSideBar;
