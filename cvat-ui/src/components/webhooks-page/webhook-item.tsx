// Copyright (C) 2022 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React, { useEffect, useState } from 'react';
import {
    Col, Row, Button, Menu, Dropdown,
} from 'antd';
import Text from 'antd/lib/typography/Text';
import { useHistory } from 'react-router';
import moment from 'moment';
import { MoreOutlined } from '@ant-design/icons';

export interface WebhookItemProps {
    webhookInstance: any;
}

function WebhookItem(props: WebhookItemProps): JSX.Element | null {
    const history = useHistory();
    const { webhookInstance } = props;
    const {
        id, description, updatedDate, createdDate, owner, targetUrl, events,
    } = webhookInstance;

    const updated = moment(updatedDate).fromNow();
    const created = moment(createdDate).format('MMMM Do YYYY');
    const username = owner ? owner.username : null;

    const statusClassName = 'cvat-webhook-status-unavailable';
    return (
        <Row className='cvat-webhooks-list-item'>
            <Col>
                <svg height='32' width='32' className={statusClassName}>
                    <circle cx='16' cy='11' r='4' strokeWidth='0' />
                </svg>
            </Col>
            <Col span={6}>
                <Text strong type='secondary' className='cvat-item-webhook-id'>{`#${id}: `}</Text>
                <Text strong className='cvat-item-webhook-description'>{description}</Text>
                <br />
                {username && (
                    <>
                        <Text type='secondary'>{`Created by ${username} on ${created}`}</Text>
                        <br />
                    </>
                )}
                <Text type='secondary'>{`Last updated ${updated}`}</Text>
            </Col>
            <Col span={6} offset={1}>
                <Text type='secondary' className='cvat-webhook-info-text'>URL:</Text>
                <Text>{targetUrl}</Text>
            </Col>
            <Col span={7}>
                <Text type='secondary' className='cvat-webhook-info-text'>Events:</Text>
                <Text>{events.map((event) => event.name).join(', ')}</Text>
            </Col>
            <Col span={3}>
                <Row justify='end'>
                    <Col>
                        <Button
                            className='cvat-item-ping-webhook-button'
                            type='primary'
                            ghost
                            href={`/webhooks/${id}`}
                            onClick={(e: React.MouseEvent): void => {
                                e.preventDefault();
                            }}
                        >
                            Ping
                        </Button>
                    </Col>
                </Row>
                <Row justify='end'>
                    <Col>
                        <Dropdown overlay={() => (
                            <Menu>
                                <Menu.Item key='qwerq'>
                                    <a
                                        href={`/webhooks/${id}`}
                                        onClick={(e: React.MouseEvent) => {
                                            e.preventDefault();
                                            history.push(`/webhooks/${id}`);
                                            return false;
                                        }}
                                    >
                                        Edit
                                    </a>
                                </Menu.Item>
                                <Menu.Item key='wqwe'>
                                    Delete
                                </Menu.Item>
                            </Menu>
                        )}
                        >
                            <div className='cvat-webhooks-page-actions-button'>
                                <Text className='cvat-text-color'>Actions</Text>
                                <MoreOutlined className='cvat-menu-icon' />
                            </div>
                        </Dropdown>
                    </Col>
                </Row>
            </Col>
        </Row>
    );
}

export default React.memo(WebhookItem);
