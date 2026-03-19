// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useState, useEffect, useCallback } from 'react';
import { useSelector, shallowEqual } from 'react-redux';
import { CombinedState } from 'reducers';

import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { Col, Row } from 'antd/lib/grid';
import Typography from 'antd/lib/typography';
import Text from 'antd/lib/typography/Text';
import Menu from 'antd/lib/menu';

import { getTabFromHash } from 'utils/location-utils';
import CVATLoadingSpinner from 'components/common/loading-spinner';
import dimensions from 'utils/dimensions';
import ProfileContent from './profile-content/profile-content';
import SecurityContent from './security-content/security-content';

import './styles.scss';

const { Title } = Typography;
const supportedTabs = ['profile', 'security'];

function ProfilePageComponent(): JSX.Element {
    const { user, fetching, isPasswordChangeEnabled } = useSelector((state: CombinedState) => ({
        user: state.auth.user,
        fetching: state.auth.fetching || state.auth.apiTokens.fetching,
        isPasswordChangeEnabled: state.serverAPI.configuration.isPasswordChangeEnabled,
    }), shallowEqual);

    const [activeTab, setActiveTab] = useState(getTabFromHash(supportedTabs));

    const menuItems = [
        {
            key: 'profile',
            icon: <UserOutlined />,
            label: <Text className='cvat-profile-page-menu-item-profile'>Profile</Text>,
        },
        {
            key: 'security',
            icon: <LockOutlined />,
            label: <Text className='cvat-profile-page-menu-item-security'>Security</Text>,
        },
    ];

    const onMenuClick = useCallback((key: string): void => {
        setActiveTab(key);
    }, []);

    useEffect(() => {
        const onHashChange = (): void => setActiveTab(getTabFromHash(supportedTabs));
        window.addEventListener('hashchange', onHashChange);
        return (): void => window.removeEventListener('hashchange', onHashChange);
    }, []);

    useEffect(() => {
        window.history.replaceState(null, '', `#${activeTab}`);
    }, [activeTab]);

    const renderContent = (): JSX.Element => {
        switch (activeTab) {
            case 'security':
                return <SecurityContent isPasswordChangeEnabled={isPasswordChangeEnabled} />;
            case 'profile':
            default:
                return <ProfileContent />;
        }
    };

    return (
        <div className='cvat-profile-page'>
            { fetching ? <CVATLoadingSpinner size='large' /> : null }
            <Row justify='center' align='middle'>
                <Col {...dimensions}>
                    <Title level={1} className='cvat-profile-page-welcome'>
                        {`Welcome, ${user?.username}`}
                    </Title>
                </Col>
            </Row>
            <Row justify='center' align='middle' className='cvat-profile-page-wrapper'>
                <Col
                    {...dimensions}
                    style={fetching ? {
                        pointerEvents: 'none',
                        opacity: 0.7,
                    } : {}}
                >
                    <Row>
                        <Col span={6}>
                            <Menu
                                className='cvat-profile-page-navigation-menu'
                                selectedKeys={[activeTab]}
                                mode='inline'
                                items={menuItems}
                                onClick={({ key }) => onMenuClick(key)}
                            />
                        </Col>
                        <Col span={18} className='cvat-profile-page-content'>
                            {renderContent()}
                        </Col>
                    </Row>
                </Col>
            </Row>
        </div>
    );
}

export default React.memo(ProfilePageComponent);
