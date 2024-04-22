// Copyright (C) 2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useState } from 'react';
import { Link } from 'react-router-dom';

import { Row, Col } from 'antd/lib/grid';
import Card from 'antd/lib/card';
import Text from 'antd/lib/typography/Text';
import Progress from 'antd/lib/progress';
import { LoadingOutlined, MoreOutlined } from '@ant-design/icons';
import Dropdown from 'antd/lib/dropdown';
import Button from 'antd/lib/button';
import Menu from 'antd/lib/menu';
import notification from 'antd/lib/notification';

import { RQStatus, Request, getCore } from 'cvat-core-wrapper';

import moment from 'moment';

const core = getCore();

export interface Props {
    request: Request;
}

function constructLink(operation: typeof Request['operation']): string | null {
    const {
        target, jobID, taskID, projectID,
    } = operation;

    if (target === 'project' && projectID) {
        return `/projects/${projectID}`;
    }
    if (target === 'task' && taskID) {
        return `/tasks/${taskID}`;
    }
    if (target === 'job' && jobID) {
        return `/jobs/${jobID}`;
    }
    return null;
}

function constructTimestamps(request: Request): JSX.Element {
    const started = moment(request.startDate).format('MMM Do YY, H:mm');
    const finished = moment(request.finishDate).format('MMM Do YY, H:mm');
    const enqueued = moment(request.enqueueDate).format('MMM Do YY, H:mm');
    const expired = moment(request.expireDate).format('MMM Do YY, H:mm');

    switch (request.status) {
        case RQStatus.QUEUED: {
            return (
                <Row>
                    <Text type='secondary'>{`Enqueued by ${request.owner.username} on ${enqueued}`}</Text>
                </Row>
            );
        }
        case RQStatus.FINISHED: {
            if (request.expireDate) {
                return (
                    <>
                        <Row>
                            <Text type='secondary'>{`Started by ${request.owner.username} on ${started}`}</Text>
                        </Row>
                        <Row>
                            <Text type='secondary'>{`Expires on ${expired}`}</Text>
                        </Row>
                    </>
                );
            }
            return (
                <>
                    <Row>
                        <Text type='secondary'>{`Started by ${request.owner.username} on ${started}`}</Text>
                    </Row>
                    <Row>
                        <Text type='secondary'>{`Finished on ${finished}`}</Text>

                    </Row>
                </>
            );
        }
        case RQStatus.FAILED: {
            return (
                <Row>
                    <Text type='secondary'>{`Started by ${request.owner.username} on ${started}`}</Text>
                </Row>
            );
        }
        case RQStatus.STARTED: {
            return (
                <>
                    <Row>
                        <Text type='secondary'>{`Enqueued by ${request.owner.username} on ${enqueued}`}</Text>
                    </Row>
                    <Row>
                        <Text type='secondary'>{`Started on ${started}`}</Text>
                    </Row>
                </>
            );
        }
        default: {
            return (
                <Row>
                    <Text type='secondary'>{`Enqueued by ${request.owner.username} on ${enqueued}`}</Text>
                </Row>
            );
        }
    }
}

function truncateName(name: string, maxLength: number): string {
    if (name.length > maxLength) {
        return `${name.slice(0, maxLength - 3)}...`;
    }
    return name;
}

function statusMessage(request: Request, defaultMessage: string, postfix?: JSX.Element): JSX.Element {
    if (request.message) {
        return (
            <>
                {request.message}
                {postfix || null}
            </>
        );
    }

    return (
        <>
            {defaultMessage}
            {postfix || null}
        </>
    );
}

export default function RequestCard(props: Props): JSX.Element {
    const { request } = props;
    const { operation } = request;
    const { type } = operation;
    const [isActive, setIsActive] = useState(true);

    let textType: 'success' | 'danger' | 'warning' | undefined;
    if ([RQStatus.FAILED, RQStatus.UNKNOWN].includes(request.status)) {
        textType = 'danger';
    } else if ([RQStatus.QUEUED].includes(request.status)) {
        textType = 'warning';
    } else if ([RQStatus.FINISHED].includes(request.status)) {
        textType = 'success';
    }
    const linkToEntity = constructLink(request.operation);
    const percent = request.status === RQStatus.FINISHED ? 100 : request.progress;
    const timestamps = constructTimestamps(request);

    const truncatedName = truncateName(operation.name, 60);

    const progress = request.status === RQStatus.FINISHED ? 100 : request.progress;
    const percentSymbol = (request.status === RQStatus.FAILED || !progress) ? '' : '%';

    const style: React.CSSProperties = {};
    if (!isActive) {
        style.pointerEvents = 'none';
        style.opacity = 0.5;
    }

    return (
        <Row justify='center' align='middle'>
            <Col span={24}>
                <Card className='cvat-requests-card' style={style}>
                    <Row justify='space-between'>
                        <Col span={12}>
                            <Row style={{ paddingBottom: [RQStatus.FAILED].includes(request.status) ? '10px' : '0' }}>
                                <Col className='cvat-requests-type' span={5}>
                                    <Text>
                                        {type.split(':').map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                                        {' '}
                                    </Text>
                                </Col>
                                <Col className='cvat-requests-name'>
                                    {linkToEntity ?
                                        (<Link to={linkToEntity}>{truncatedName}</Link>) :
                                        <Text>{truncatedName}</Text>}
                                </Col>
                            </Row>
                            {timestamps}
                        </Col>
                        <Col span={10} className='cvat-request-item-progress-wrapper'>
                            <Row>
                                <Col span={21}>
                                    <Row>
                                        <Text
                                            type={textType}
                                            strong
                                        >
                                            {((): JSX.Element => {
                                                if (request.status === RQStatus.FINISHED) {
                                                    return statusMessage(request, 'Finished');
                                                }

                                                if ([RQStatus.QUEUED].includes(request.status)) {
                                                    return statusMessage(request, 'Queued', <LoadingOutlined />);
                                                }

                                                if ([RQStatus.STARTED].includes(request.status)) {
                                                    return statusMessage(request, 'In progress', <LoadingOutlined />);
                                                }

                                                if (request.status === RQStatus.FAILED) {
                                                    return statusMessage(request, 'Failed');
                                                }

                                                if (request.status === RQStatus.UNKNOWN) {
                                                    return statusMessage(request, 'Unknown status received');
                                                }

                                                return statusMessage(request, 'Unknown status received');
                                            })()}
                                        </Text>
                                        {
                                            request.status === RQStatus.FAILED ? (
                                                <Text type='danger'>{request.message}</Text>
                                            ) : null
                                        }
                                    </Row>
                                    <Row>
                                        <Col span={18} className='cvat-requests-progress'>
                                            {
                                                request.status !== RQStatus.FAILED ? (
                                                    <Progress
                                                        percent={percent}
                                                        strokeColor={{
                                                            from: '#108ee9',
                                                            to: '#87d068',
                                                        }}
                                                        showInfo={false}
                                                        strokeWidth={5}
                                                        size='small'
                                                    />
                                                ) : null
                                            }
                                        </Col>
                                        <Col span={2} className='cvat-requests-percent'>
                                            {progress || ''}
                                            {percentSymbol}
                                        </Col>
                                    </Row>
                                    {
                                        operation?.format ? (
                                            <Row>
                                                <Col className='cvat-format-name'>
                                                    <Text type='secondary'>{operation.format}</Text>
                                                </Col>
                                            </Row>
                                        ) : null
                                    }
                                </Col>

                                <Col span={3} style={{ display: 'flex', justifyContent: 'end' }}>
                                    <Dropdown
                                        destroyPopupOnHide
                                        trigger={['click']}
                                        overlay={() => (
                                            <Menu selectable={false} className='cvat-actions-menu cvat-request-actions-menu'>
                                                {
                                                    request.url ? (
                                                        <Menu.Item
                                                            key='download'
                                                            onClick={() => {
                                                                const downloadAnchor = window.document.getElementById('downloadAnchor') as HTMLAnchorElement;
                                                                downloadAnchor.href = request.url;
                                                                downloadAnchor.click();
                                                            }}
                                                        >
                                                                Download
                                                        </Menu.Item>
                                                    ) : null
                                                }
                                                <Menu.Item
                                                    key='delete'
                                                    onClick={() => {
                                                        core.server.request(`/api/background-processes/${request.id}`, {
                                                            method: 'DELETE',
                                                        }).then(() => {
                                                            setIsActive(false);
                                                        }).catch((error: Error) => {
                                                            notification.error({
                                                                message: 'Failed to delete RQ job',
                                                                description: error.toString(),
                                                            });
                                                        });
                                                    }}
                                                >
                                                        Delete
                                                </Menu.Item>
                                                <Menu.Item
                                                    key='cancel'
                                                    onClick={() => {
                                                        core.server.request(
                                                            `/api/background-processes/${request.id}/cancel`, {
                                                                method: 'POST',
                                                            }).then(() => {
                                                            setIsActive(false);
                                                        }).catch((error: Error) => {
                                                            notification.error({
                                                                message: 'Failed to cancel RQ job',
                                                                description: error.toString(),
                                                            });
                                                        });
                                                    }}
                                                >
                                                        Cancel
                                                </Menu.Item>
                                            </Menu>
                                        )}
                                    >
                                        <Button type='link' size='middle' className='cvat-requests-page-actions-button' icon={<MoreOutlined className='cvat-menu-icon' />} />
                                    </Dropdown>
                                </Col>
                            </Row>
                        </Col>
                    </Row>
                </Card>
            </Col>
        </Row>
    );
}
