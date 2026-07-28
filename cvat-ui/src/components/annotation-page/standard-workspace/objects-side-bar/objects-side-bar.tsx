// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React, {
    Dispatch, TransitionEvent, useEffect, useState,
} from 'react';
import { AnyAction } from 'redux';
import { connect } from 'react-redux';
import { MenuFoldOutlined, MenuUnfoldOutlined } from '@ant-design/icons';
import Tabs from 'antd/lib/tabs';
import Layout from 'antd/lib/layout';

import { CombinedState } from 'reducers';
import { DimensionType } from 'cvat-core-wrapper';
import LabelsList from 'components/annotation-page/standard-workspace/objects-side-bar/labels-list';
import { collapseSidebar as collapseSidebarAction } from 'actions/annotation-actions';
import AppearanceBlock from 'components/annotation-page/appearance-block';
import IssuesListComponent from 'components/annotation-page/standard-workspace/objects-side-bar/issues-list';
import { OBJECTS_SIDEBAR_OPEN_Z_LAYER_EVENT } from 'utils/objects-sidebar';

interface OwnProps {
    objectsList: JSX.Element;
}

interface StateToProps {
    sidebarCollapsed: boolean;
    jobInstance: any;
}

interface DispatchToProps {
    collapseSidebar(): void;
}

function mapStateToProps(state: CombinedState): StateToProps {
    const {
        annotation: {
            sidebarCollapsed,
            job: { instance: jobInstance },
        },
    } = state;

    return {
        sidebarCollapsed,
        jobInstance,
    };
}

function mapDispatchToProps(dispatch: Dispatch<AnyAction>): DispatchToProps {
    return {
        collapseSidebar(): void {
            dispatch(collapseSidebarAction());
        },
    };
}

function ObjectsSideBar(props: StateToProps & DispatchToProps & OwnProps): JSX.Element {
    const {
        sidebarCollapsed, collapseSidebar, objectsList, jobInstance,
    } = props;
    const [activeTab, setActiveTab] = useState('objects');
    useEffect((): () => void => {
        const onOpenZLayer = (): void => {
            setActiveTab('objects');
        };

        window.addEventListener(OBJECTS_SIDEBAR_OPEN_Z_LAYER_EVENT, onOpenZLayer);

        return (): void => {
            window.removeEventListener(OBJECTS_SIDEBAR_OPEN_Z_LAYER_EVENT, onOpenZLayer);
        };
    }, []);

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

    const is2D = jobInstance ? jobInstance.dimension === DimensionType.DIMENSION_2D : true;
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
                activeKey={activeTab}
                onChange={setActiveTab}
                className='cvat-objects-sidebar-tabs'
                items={[{
                    key: 'objects',
                    label: 'Objects',
                    children: objectsList,
                }, {
                    key: 'labels',
                    label: 'Labels',
                    forceRender: true,
                    children: <LabelsList />,
                }, ...(is2D ? [{ key: 'issues', label: 'Issues', children: <IssuesListComponent /> }] : [])]}
            />
            {!sidebarCollapsed && <AppearanceBlock />}
        </Layout.Sider>
    );
}

export default connect(mapStateToProps, mapDispatchToProps)(React.memo(ObjectsSideBar));
