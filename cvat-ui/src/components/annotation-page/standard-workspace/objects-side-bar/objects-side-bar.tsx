// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React from 'react';
import Text from 'antd/lib/typography/Text';
import Icon from 'antd/lib/icon';
import Tabs from 'antd/lib/tabs';
import Layout from 'antd/lib/layout';
import { RadioChangeEvent } from 'antd/lib/radio';
import { SliderValue } from 'antd/lib/slider';
import { CheckboxChangeEvent } from 'antd/lib/checkbox';

import { ColorBy } from 'reducers/interfaces';
import ObjectsListContainer from 'containers/annotation-page/standard-workspace/objects-side-bar/objects-list';
import LabelsListContainer from 'containers/annotation-page/standard-workspace/objects-side-bar/labels-list';
import AppearanceBlock from './appearance-block';

interface Props {
    sidebarCollapsed: boolean;
    appearanceCollapsed: boolean;
    colorBy: ColorBy;
    opacity: number;
    selectedOpacity: number;
    blackBorders: boolean;
    showBitmap: boolean;
    showProjections: boolean;

    collapseSidebar(): void;
    collapseAppearance(): void;

    changeShapesColorBy(event: RadioChangeEvent): void;
    changeShapesOpacity(event: SliderValue): void;
    changeSelectedShapesOpacity(event: SliderValue): void;
    changeShapesBlackBorders(event: CheckboxChangeEvent): void;
    changeShowBitmap(event: CheckboxChangeEvent): void;
    changeShowProjections(event: CheckboxChangeEvent): void;
}

function ObjectsSideBar(props: Props): JSX.Element {
    const {
        sidebarCollapsed,
        appearanceCollapsed,
        colorBy,
        opacity,
        selectedOpacity,
        blackBorders,
        showBitmap,
        showProjections,
        collapseSidebar,
        collapseAppearance,
        changeShapesColorBy,
        changeShapesOpacity,
        changeSelectedShapesOpacity,
        changeShapesBlackBorders,
        changeShowBitmap,
        changeShowProjections,
    } = props;

    const appearanceProps = {
        collapseAppearance,
        appearanceCollapsed,
        colorBy,
        opacity,
        selectedOpacity,
        blackBorders,
        showBitmap,
        showProjections,

        changeShapesColorBy,
        changeShapesOpacity,
        changeSelectedShapesOpacity,
        changeShapesBlackBorders,
        changeShowBitmap,
        changeShowProjections,
    };

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

            { !sidebarCollapsed && <AppearanceBlock {...appearanceProps} /> }
        </Layout.Sider>
    );
}

export default React.memo(ObjectsSideBar);
