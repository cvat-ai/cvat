// Copyright (C) 2020-2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React, { Dispatch, useEffect, TransitionEvent } from 'react';
import { AnyAction } from 'redux';
import { connect } from 'react-redux';
import { MenuFoldOutlined, MenuUnfoldOutlined } from '@ant-design/icons';
import Text from 'antd/lib/typography/Text';
import Tabs from 'antd/lib/tabs';
import Layout from 'antd/lib/layout';

import { Canvas } from 'cvat-canvas-wrapper';
import { CombinedState } from 'reducers/interfaces';
import LabelsList from 'components/annotation-page/standard-workspace/objects-side-bar/labels-list';
import {
    collapseSidebar as collapseSidebarAction,
    updateTabContentHeight as updateTabContentHeightAction,
} from 'actions/annotation-actions';
import AppearanceBlock, { computeHeight } from 'components/annotation-page/appearance-block';
import IssuesListComponent from 'components/annotation-page/standard-workspace/objects-side-bar/issues-list';

interface OwnProps {
    objectsList: JSX.Element;
}

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

function ObjectsSideBar(props: StateToProps & DispatchToProps & OwnProps): JSX.Element {
    const {
        sidebarCollapsed, canvasInstance, collapseSidebar, updateTabContentHeight, objectsList,
    } = props;

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

    const collapse = (): void => {
        const [collapser] = window.document.getElementsByClassName('cvat-objects-sidebar');
        const listener = (event: TransitionEvent): void => {
            if (event.target && event.propertyName === 'width' && event.target === collapser) {
                canvasInstance.fitCanvas();
                canvasInstance.fit();
                (collapser as HTMLElement).removeEventListener('transitionend', listener as any);
            }
        };

        if (collapser) {
            (collapser as HTMLElement).addEventListener('transitionend', listener as any);
        }

        collapseSidebar();
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
                onClick={collapse}
            >
                {sidebarCollapsed ? <MenuFoldOutlined title='Show' /> : <MenuUnfoldOutlined title='Hide' />}
            </span>

            <Tabs type='card' defaultActiveKey='objects' className='cvat-objects-sidebar-tabs'>
                <Tabs.TabPane tab={<Text strong>Objects</Text>} key='objects'>
                    {objectsList}
                </Tabs.TabPane>
                <Tabs.TabPane forceRender tab={<Text strong>Labels</Text>} key='labels'>
                    <LabelsList />
                </Tabs.TabPane>
                <Tabs.TabPane tab={<Text strong>Issues</Text>} key='issues'>
                    <IssuesListComponent />
                </Tabs.TabPane>
            </Tabs>

            {!sidebarCollapsed && <AppearanceBlock />}
        </Layout.Sider>
    );
}

export default connect(mapStateToProps, mapDispatchToProps)(React.memo(ObjectsSideBar));
