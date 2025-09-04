// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';

import React, { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { CombinedState } from 'reducers';
import { getTabFromHash } from 'utils/location-utils';
import CVATLoadingSpinner from 'components/common/loading-spinner';

import { Col, Row } from 'antd/lib/grid';
import Typography from 'antd/lib/typography';
import Menu from 'antd/lib/menu';
import ProfileContent from './profile-content';
import SecurityContent from './security-content';

const { Title } = Typography;

function ProfilePageComponent(): JSX.Element {
    const { user, fetching, isPasswordChangeEnabled } = useSelector((state: CombinedState) => ({
        user: state.auth.user,
        fetching: state.auth.fetching,
        isPasswordChangeEnabled: state.serverAPI.configuration.isPasswordChangeEnabled,
    }));

    const supportedTabs = isPasswordChangeEnabled ? ['profile', 'security'] : ['profile'];
    const [activeTab, setActiveTab] = useState(getTabFromHash(supportedTabs));

    const menuItems = [
        {
            key: 'profile',
            icon: <UserOutlined />,
            label: 'Profile',
        },
        ...(isPasswordChangeEnabled ? [{
            key: 'security',
            icon: <LockOutlined />,
            label: 'Security',
        }] : []),
    ];

    const onMenuClick = useCallback((key: string): void => {
        setActiveTab(key);
    }, []);

    useEffect(() => {
        const onHashChange = (): void => setActiveTab(getTabFromHash(supportedTabs));
        window.addEventListener('hashchange', onHashChange);
        return (): void => window.removeEventListener('hashchange', onHashChange);
    }, [supportedTabs]);

    useEffect(() => {
        window.history.replaceState(null, '', `#${activeTab}`);
    }, [activeTab]);

    const renderContent = (): JSX.Element => {
        switch (activeTab) {
            case 'security':
                return <SecurityContent />;
            case 'profile':
            default:
                return <ProfileContent />;
        }
    };

    return (
        <div className='cvat-profile-page'>
            { fetching ? <CVATLoadingSpinner size='large' /> : null }
            <Row justify='center' align='middle' className='cvat-profile-page-wrapper'>
                <Col
                    md={22}
                    lg={18}
                    xl={16}
                    xxl={14}
                    style={fetching ? {
                        pointerEvents: 'none',
                        opacity: 0.7,
                    } : {}}
                >
                    <Row>
                        <Title level={1}>
                            {`Welcome, ${user?.username}`}
                        </Title>
                    </Row>
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
