// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { Dispatch, TransitionEvent } from 'react';
import { AnyAction } from 'redux';
import { connect } from 'react-redux';
import { MenuFoldOutlined, MenuUnfoldOutlined } from '@ant-design/icons';
import Tabs from 'antd/lib/tabs';
import Layout from 'antd/lib/layout';

import { CombinedState } from 'reducers';
import { collapseSidebar as collapseSidebarAction } from 'actions/annotation-actions';
import AudioAppearanceBlock from 'audio/components/annotation-page/audio-workspace/audio-appearance-block';
import AudioLabelsList from './audio-labels-list';

interface OwnProps {
    objectsList: JSX.Element;
    appearanceHidden?: boolean;
}

interface StateToProps {
    sidebarCollapsed: boolean;
}

interface DispatchToProps {
    collapseSidebar(): void;
}

function mapStateToProps(state: CombinedState): StateToProps {
    const {
        annotation: { sidebarCollapsed },
    } = state;

    return { sidebarCollapsed };
}

function mapDispatchToProps(dispatch: Dispatch<AnyAction>): DispatchToProps {
    return {
        collapseSidebar(): void {
            dispatch(collapseSidebarAction());
        },
    };
}

function AudioObjectsSideBar(props: StateToProps & DispatchToProps & OwnProps): JSX.Element {
    const {
        sidebarCollapsed, collapseSidebar, objectsList, appearanceHidden,
    } = props;

    const collapse = (): void => {
        const [collapser] = window.document.getElementsByClassName('cvat-objects-sidebar');
        const listener = (event: TransitionEvent): void => {
            if (event.target && event.propertyName === 'width' && event.target === collapser) {
                window.dispatchEvent(new Event('resize'));
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
            width={320}
            collapsedWidth={0}
            reverseArrow
            collapsible
            trigger={null}
            collapsed={sidebarCollapsed}
        >
            {/* eslint-disable-next-line */}
            <span
                className='cvat-objects-sidebar-sider'
                onClick={collapse}
            >
                {sidebarCollapsed ? <MenuFoldOutlined title='Show' /> : <MenuUnfoldOutlined title='Hide' />}
            </span>

            <Tabs
                type='card'
                defaultActiveKey='objects'
                className='cvat-objects-sidebar-tabs'
                items={[{
                    key: 'objects',
                    label: 'Objects',
                    children: objectsList,
                }, {
                    key: 'labels',
                    label: 'Labels',
                    forceRender: true,
                    children: <AudioLabelsList />,
                }]}
            />
            {!sidebarCollapsed && !appearanceHidden && <AudioAppearanceBlock />}
        </Layout.Sider>
    );
}

export default connect(mapStateToProps, mapDispatchToProps)(React.memo(AudioObjectsSideBar));
