// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { useSelector } from 'react-redux';
import Alert from 'antd/lib/alert';
import Space from 'antd/lib/space';
import Text from 'antd/lib/typography/Text';
import {
    ClockCircleOutlined,
    DashboardOutlined,
    DatabaseOutlined,
    ExclamationCircleOutlined,
    HddOutlined,
    SafetyCertificateOutlined,
} from '@ant-design/icons';

import { CombinedState } from 'reducers';

interface ServerUnavailableProps {
    details: string | null;
}

function renderHealthCheckIcon(checkName: string): JSX.Element {
    if (checkName.startsWith('Cache backend') || checkName.startsWith('DatabaseBackend')) {
        return <DatabaseOutlined className='cvat-health-check-icon' />;
    }

    if (checkName === 'DiskUsage') {
        return <HddOutlined className='cvat-health-check-icon' />;
    }

    if (checkName === 'MemoryUsage') {
        return <DashboardOutlined className='cvat-health-check-icon' />;
    }

    if (checkName === 'OPAHealthCheck') {
        return <SafetyCertificateOutlined className='cvat-health-check-icon' />;
    }

    return <ExclamationCircleOutlined className='cvat-health-check-icon' />;
}

function DefaultServerUnavailableComponent({ details }: ServerUnavailableProps): JSX.Element {
    const rows = details ? details.split('\n').filter((row: string): boolean => !!row.trim()) : [];
    if (!rows.length) {
        return (
            <div className='cvat-server-unavailable-message'>
                <Text>
                    CVAT could not reach the server or one of the services required to run it.
                    Make sure the backend, database, Redis and Open Policy Agent are running and available.
                </Text>
            </div>
        );
    }

    const [summary, ...checks] = rows;

    if (!checks.length) {
        return (
            <Alert
                className='cvat-health-check-error'
                type='error'
                showIcon
                icon={<ClockCircleOutlined />}
                message='Connection check failed'
                description={summary}
            />
        );
    }

    return (
        <Alert
            className='cvat-health-check-error'
            type='error'
            showIcon
            message='Required services are not healthy'
            description={(
                <Space direction='vertical' size={12}>
                    <Text type='secondary'>{summary}</Text>
                    <div className='cvat-health-check-list'>
                        {checks.map((check: string): JSX.Element => {
                            const separator = check.indexOf(' - ');
                            const checkName = separator === -1 ? check : check.slice(0, separator);
                            const checkStatus = separator === -1 ? '' : check.slice(separator + 3);

                            return (
                                <div className='cvat-health-check-item' key={check}>
                                    {renderHealthCheckIcon(checkName)}
                                    <div>
                                        <Text strong>{checkName}</Text>
                                        {checkStatus && (
                                            <Text className='cvat-health-check-status' type='secondary'>
                                                {checkStatus}
                                            </Text>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </Space>
            )}
        />
    );
}

function ServerUnavailableComponent(props: Readonly<ServerUnavailableProps>): JSX.Element {
    const overrides = useSelector(
        (state: CombinedState) => state.plugins.overridableComponents.app.serverUnavailable,
    );

    if (overrides.length) {
        const [Component] = overrides.slice(-1);
        return <Component {...props} />;
    }

    return <DefaultServerUnavailableComponent {...props} />;
}

export default React.memo(ServerUnavailableComponent);
