// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useHistory } from 'react-router';
import moment from 'moment';
import { Col, Row } from 'antd/lib/grid';
import Button from 'antd/lib/button';
import Dropdown from 'antd/lib/dropdown';
import Text from 'antd/lib/typography/Text';
import { MoreOutlined } from '@ant-design/icons';
import Modal from 'antd/lib/modal';
import Paragraph from 'antd/lib/typography/Paragraph';

import { groupEvents } from 'components/setup-webhook-pages/setup-webhook-content';
import Menu from 'components/dropdown-menu';
import CVATTooltip from 'components/common/cvat-tooltip';
import { deleteWebhookAsync } from 'actions/webhooks-actions';

export interface WebhookItemProps {
    webhookInstance: any;
}

interface WebhookStatus {
    message?: string;
    className: string;
}

function setUpWebhookStatus(status: number): WebhookStatus {
    if (status && status.toString().startsWith('2')) {
        return {
            message: `Last delivery was successful. Response: ${status}`,
            className: 'cvat-webhook-status-available',
        };
    }
    if (status && status.toString().startsWith('5')) {
        return {
            message: `Last delivery was not successful. Response: ${status}`,
            className: 'cvat-webhook-status-failed',
        };
    }
    return {
        message: status ? `Response: ${status}` : undefined,
        className: 'cvat-webhook-status-unavailable',
    };
}

function WebhookItem(props: WebhookItemProps): JSX.Element | null {
    const [isRemoved, setIsRemoved] = useState<boolean>(false);
    const [pingFetching, setPingFetching] = useState<boolean>(false);
    const history = useHistory();
    const dispatch = useDispatch();
    const { webhookInstance } = props;
    const {
        id, description, updatedDate, createdDate, owner, targetURL, events,
    } = webhookInstance;

    const updated = moment(updatedDate).fromNow();
    const created = moment(createdDate).format('MMMM Do YYYY');
    const username = owner ? owner.username : null;

    const { lastStatus } = webhookInstance;
    const [webhookStatus, setWebhookStatus] = useState<WebhookStatus>(setUpWebhookStatus(lastStatus));

    const eventsList = groupEvents(events).join(', ');
    return (
        <Row className='cvat-webhooks-list-item' style={isRemoved ? { opacity: 0.5, pointerEvents: 'none' } : {}}>
            <Col span={1}>
                {
                    webhookStatus.message ? (
                        <CVATTooltip title={webhookStatus.message} overlayStyle={{ maxWidth: '300px' }}>
                            <svg height='24' width='24' className={webhookStatus.className}>
                                <circle cx='12' cy='12' r='5' strokeWidth='0' />
                            </svg>
                        </CVATTooltip>
                    ) : (
                        <svg height='24' width='24' className={webhookStatus.className}>
                            <circle cx='12' cy='12' r='5' strokeWidth='0' />
                        </svg>
                    )
                }

            </Col>
            <Col span={6}>
                <Paragraph ellipsis={{
                    tooltip: description,
                    rows: 2,
                }}
                >
                    <Text strong type='secondary' className='cvat-item-webhook-id'>{`#${id}: `}</Text>
                    <Text strong className='cvat-item-webhook-description'>{description}</Text>
                </Paragraph>
                {username && (
                    <>
                        <Text type='secondary'>{`Created by ${username} on ${created}`}</Text>
                        <br />
                    </>
                )}
                <Text type='secondary'>{`Last updated ${updated}`}</Text>
            </Col>
            <Col span={6} offset={1}>
                <Paragraph ellipsis={{
                    tooltip: targetURL,
                    rows: 3,
                }}
                >
                    <Text type='secondary' className='cvat-webhook-info-text'>URL:</Text>
                    {targetURL}
                </Paragraph>
            </Col>
            <Col span={6} offset={1}>
                <Paragraph ellipsis={{
                    tooltip: eventsList,
                    rows: 3,
                }}
                >
                    <Text type='secondary' className='cvat-webhook-info-text'>Events:</Text>
                    {eventsList}
                </Paragraph>
            </Col>
            <Col span={3}>
                <Row justify='end'>
                    <Col>
                        <Button
                            className='cvat-item-ping-webhook-button'
                            type='primary'
                            disabled={pingFetching}
                            loading={pingFetching}
                            size='large'
                            ghost
                            onClick={(): void => {
                                setPingFetching(true);
                                webhookInstance.ping().then((deliveryInstance: any) => {
                                    setWebhookStatus(setUpWebhookStatus(
                                        deliveryInstance.statusCode ? deliveryInstance.statusCode : 'Timeout',
                                    ));
                                }).finally(() => {
                                    setPingFetching(false);
                                });
                            }}
                        >
                            Ping
                        </Button>
                    </Col>
                </Row>
                <Row justify='end'>
                    <Col>
                        <Dropdown
                            trigger={['click']}
                            destroyPopupOnHide
                            overlay={() => (
                                <Menu>
                                    <Menu.Item key='edit'>
                                        <a
                                            href={`/webhooks/update/${id}`}
                                            onClick={(e: React.MouseEvent) => {
                                                e.preventDefault();
                                                history.push(`/webhooks/update/${id}`);
                                                return false;
                                            }}
                                        >
                                            Edit
                                        </a>
                                    </Menu.Item>
                                    <Menu.Item
                                        key='delete'
                                        onClick={() => {
                                            Modal.confirm({
                                                title: 'Are you sure you want to remove the hook?',
                                                content: 'It will stop notificating the specified URL about listed events',
                                                className: 'cvat-modal-confirm-remove-webhook',
                                                onOk: () => {
                                                    dispatch(deleteWebhookAsync(webhookInstance)).then(() => {
                                                        setIsRemoved(true);
                                                    });
                                                },
                                            });
                                        }}
                                    >
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
