// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React, { Dispatch, useEffect } from 'react';
import { AnyAction } from 'redux';
import { connect } from 'react-redux';
import Text from 'antd/lib/typography/Text';
import Icon from 'antd/lib/icon';
import Tabs from 'antd/lib/tabs';
import Layout from 'antd/lib/layout';

import { Canvas } from 'cvat-canvas-wrapper';
import { CombinedState } from 'reducers/interfaces';
import ObjectsListContainer from 'containers/annotation-page/standard-workspace/objects-side-bar/objects-list';
import LabelsListContainer from 'containers/annotation-page/standard-workspace/objects-side-bar/labels-list';
import {
    collapseSidebar as collapseSidebarAction,
    updateTabContentHeight as updateTabContentHeightAction,
} from 'actions/annotation-actions';
import AppearanceBlock, { computeHeight } from 'components/annotation-page/appearance-block';

interface StateToProps {
    sidebarCollapsed: boolean;
    canvasInstance: Canvas;
}

interface DispatchToProps {
    collapseSidebar(): void;
    updateTabContentHeight(): void;
}

function mapStateToProps(state: CombinedState): StateToProps {
    const {
        annotation: {
            sidebarCollapsed,
            canvas: { instance: canvasInstance },
        },
    } = state;

    return {
        sidebarCollapsed,
        canvasInstance,
    };
}

function mapDispatchToProps(dispatch: Dispatch<AnyAction>): DispatchToProps {
    return {
        collapseSidebar(): void {
            dispatch(collapseSidebarAction());
        },
        updateTabContentHeight(): void {
            const height = computeHeight();
            dispatch(updateTabContentHeightAction(height));
        },
    };
}

function ObjectsSideBar(props: StateToProps & DispatchToProps): JSX.Element {
    const { sidebarCollapsed, canvasInstance, collapseSidebar, updateTabContentHeight } = props;

    useEffect(() => {
        const alignTabHeight = (): void => {
            if (!sidebarCollapsed) {
                updateTabContentHeight();
            }
        };

        window.addEventListener('resize', alignTabHeight);
        alignTabHeight();

        return () => {
            window.removeEventListener('resize', alignTabHeight);
        };
    }, []);

    useEffect(() => {
        const listener = (event: Event): void => {
            if (
                (event as TransitionEvent).propertyName === 'width' &&
                ((event.target as any).classList as DOMTokenList).contains('ant-tabs-tab-prev')
            ) {
                canvasInstance.fit();
            }
        };

        const [sidebar] = window.document.getElementsByClassName('cvat-objects-sidebar');

        sidebar.addEventListener('transitionstart', listener);

        return () => {
            sidebar.removeEventListener('transitionstart', listener);
        };
    }, []);

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
                {sidebarCollapsed ? <Icon type='menu-fold' title='Show' /> : <Icon type='menu-unfold' title='Hide' />}
            </span>

            <Tabs type='card' defaultActiveKey='objects' className='cvat-objects-sidebar-tabs'>
                <Tabs.TabPane tab={<Text strong>Objects</Text>} key='objects'>
                    <ObjectsListContainer />
                </Tabs.TabPane>
                <Tabs.TabPane tab={<Text strong>Labels</Text>} key='labels'>
                    <LabelsListContainer />
                </Tabs.TabPane>
            </Tabs>

            {!sidebarCollapsed && <AppearanceBlock />}
        </Layout.Sider>
    );
}

export default connect(mapStateToProps, mapDispatchToProps)(React.memo(ObjectsSideBar));
