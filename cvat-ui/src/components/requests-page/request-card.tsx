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
import Collapse from 'antd/lib/collapse';
import { Link } from 'react-router-dom';
import Dropdown from 'antd/lib/dropdown';
import Button from 'antd/lib/button';
import Menu from 'antd/lib/menu';
import CVATTooltip from 'components/common/cvat-tooltip';

import _ from 'lodash';
import moment from 'moment';

const { Panel } = Collapse;

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
    const started = moment(request.startDate).format('MMM Do YY, h:mm');
    const finished = moment(request.finishDate).format('MMM Do YY, h:mm');
    const expire = moment(request.expireDate).format('MMM Do YY, h:mm');
    let additionalText = '';
    if (request.expireDate) {
        additionalText = `; Expires at ${expire}`;
    } else if (request.finishDate) {
        additionalText = `; Finished at ${finished}`;
    }
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
                                    {linkToEntity ? (<Link to={linkToEntity}>{operation.name}</Link>) : <Text>{operation.name}</Text>}
                                </Col>
                            </Row>
                        </Col>
                        <Col span={10} className='cvat-request-item-progress-wrapper'>
                            <Row>
                                <Col span={21}>
                                    <Row>
                                        <Text
                                            type={request.status === RQStatus.QUEUED ? undefined : textType}
                                            strong
                                        >
                                            {/* TODO: add ui texts if no message is present */}
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

                                                if ([RQStatus.FAILED].includes(request.status)) {
                                                    return (
                                                        <Collapse>
                                                            <Panel header='An error occured' key='1'>
                                                                <Text type='danger' strong>
                                                                    {request.message}
                                                                </Text>
                                                            </Panel>
                                                        </Collapse>
                                                    );
                                                }

                                                if (request.status === RQStatus.UNKNOWN) {
                                                    return (<>Unknown status received</>);
                                                }

                                                return <>{request.message}</>;
                                            })()}
                                        </Text>
                                    </Row>
                                    <Row>
                                        <Col span={18} className='cvat-requests-progress'>
                                            {
                                                request.status !== RQStatus.FAILED ? (
                                                    <Progress
                                                        percent={request.status === RQStatus.FINISHED ? 100 : Math.floor(request.progress)}
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
                    <Row>
                        <Col>
                            <Text type='secondary'>
Started by kirill on
                                {started}
                                {additionalText}
                            </Text>
                        </Col>
                    </Row>
                </Card>
            </Col>
        </Row>
    );
}
