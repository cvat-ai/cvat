// Copyright (C) 2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { Row, Col } from 'antd/lib/grid';

import { RQStatus, Request } from 'cvat-core-wrapper';

import Card from 'antd/lib/card';
import Text from 'antd/lib/typography/Text';
import Progress from 'antd/lib/progress';
import { LoadingOutlined, MoreOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import Dropdown from 'antd/lib/dropdown';
import Button from 'antd/lib/button';
import Menu from 'antd/lib/menu';
import CVATTooltip from 'components/common/cvat-tooltip';

import _ from 'lodash';
import moment from 'moment';

export interface Props {
    request: Request;
}

function constructLink(operation: typeof Request['operation']): string | null {
    const { type, id } = operation;
    switch (type) {
        case 'project': {
            return `/projects/${id}`;
        }
        case 'task': {
            return `/tasks/${id}`;
        }
        default: {
            return null;
        }
    }
}

function constructTimestamps(request: Request): JSX.Element {
    const started = moment(request.startDate).format('MMM Do YY, h:mm');
    const finished = moment(request.finishDate).format('MMM Do YY, h:mm');
    const enqueued = moment(request.enqueueDate).format('MMM Do YY, h:mm');
    const expired = moment(request.expireDate).format('MMM Do YY, h:mm');

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

export default function RequestCard(props: Props): JSX.Element {
    const { request } = props;
    const { operation } = request;
    const { type } = operation;
    const info = _.omit(operation, 'type');
    const infoBlock = Object.entries(info).map(([key, val]) => (
        <Text>
            {key.charAt(0).toUpperCase() + key.slice(1)}
:
            {' '}
            {val}
        </Text>
    ));
    let textType: 'success' | 'danger' = 'success';
    if ([RQStatus.FAILED, RQStatus.UNKNOWN].includes(request.status)) {
        textType = 'danger';
    }
    const linkToEntity = constructLink(request.operation);

    const percent = request.status === RQStatus.FINISHED ? 100 : request.progress;
    const timestamps = constructTimestamps(request);

    return (
        <Row justify='center' align='middle'>
            <Col span={24}>
                <Card className='cvat-requests-card'>
                    <Row justify='space-between'>
                        <Col span={10}>
                            <Row style={{ paddingBottom: [RQStatus.FAILED].includes(request.status) ? '10px' : '0' }}>
                                <Col className='cvat-requests-type' span={6}>
                                    { infoBlock.length === 0 ? (
                                        <Text>
                                            {type.split(':').map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                                            {' '}
                                        </Text>
                                    ) : (
                                        <CVATTooltip title={<div className='cvat-request-tooltip-inner'>{infoBlock}</div>} className='cvat-request-tooltip' overlayStyle={{ maxWidth: '500px' }}>
                                            <Text>
                                                {type.split(':').map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                                                {' '}
                                            </Text>
                                        </CVATTooltip>
                                    )}
                                </Col>
                                <Col className='cvat-requests-name'>
                                    {linkToEntity ?
                                        (<Link to={linkToEntity}>{operation.name}</Link>) :
                                        <Text>{operation.name}</Text>}
                                </Col>
                            </Row>
                            {timestamps}
                        </Col>
                        <Col span={10} className='cvat-request-item-progress-wrapper'>
                            <Row>
                                <Col span={21}>
                                    <Row>
                                        <Text
                                            type={request.status === RQStatus.QUEUED ? undefined : textType}
                                            strong
                                        >
                                            {((): JSX.Element => {
                                                if (request.status === RQStatus.FINISHED) {
                                                    return (<>Finished</>);
                                                }

                                                if ([RQStatus.QUEUED, RQStatus.STARTED].includes(request.status)) {
                                                    return (
                                                        <>
                                                            {request.message}
                                                            <LoadingOutlined />
                                                        </>
                                                    );
                                                }

                                                if (request.status === RQStatus.FAILED) {
                                                    return (<>Failed</>);
                                                }

                                                if (request.status === RQStatus.UNKNOWN) {
                                                    return (<>Unknown status received</>);
                                                }

                                                return <Text>{request.message}</Text>;
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
                                            {request.status === RQStatus.FINISHED ? 100 : request.progress}
                                            {request.status === RQStatus.FAILED ? '' : '%'}
                                        </Col>
                                    </Row>
                                </Col>
                                {
                                    request.url ? (
                                        <Col span={3} style={{ display: 'flex', justifyContent: 'end' }}>
                                            <Dropdown
                                                destroyPopupOnHide
                                                trigger={['click']}
                                                overlay={() => (
                                                    <Menu selectable={false} className='cvat-actions-menu cvat-request-actions-menu'>
                                                        <Menu.Item>Download</Menu.Item>
                                                    </Menu>
                                                )}
                                            >
                                                <Button type='link' size='middle' className='cvat-requests-page-actions-button' icon={<MoreOutlined className='cvat-menu-icon' />} />
                                            </Dropdown>
                                        </Col>
                                    ) : null
                                }
                            </Row>
                        </Col>
                    </Row>
                </Card>
            </Col>
        </Row>
    );
}
