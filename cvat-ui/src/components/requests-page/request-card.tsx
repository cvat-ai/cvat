// Copyright (C) 2024 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { Row, Col } from 'antd/lib/grid';

import { RQStatus, Request } from 'cvat-core-wrapper';

import Card from 'antd/lib/card';
import Text from 'antd/lib/typography/Text';
import Progress from 'antd/lib/progress';
import { LoadingOutlined } from '@ant-design/icons';
import Collapse from 'antd/lib/collapse';
import dimensions from '../projects-page/dimensions';

const { Panel } = Collapse;

export interface Props {
    request: Request;
}

export default function RequestCard(props: Props): JSX.Element {
    const { request } = props;
    let textType: 'success' | 'danger' = 'success';
    if ([RQStatus.FAILED, RQStatus.UNKNOWN].includes(request.status)) {
        textType = 'danger';
    }
    return (
        <Row justify='center' align='middle'>
            <Col className='cvat-requests-list' {...dimensions}>
                <Card className='cvat-requests-card'>
                    <Row>
                        <Col span={6} className='cvat-requests-type'>
                            {request.type.split(':').map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                            :&nbsp;
                            {request.entity.type.charAt(0).toUpperCase() + request.entity.type.slice(1)}
                            #
                            <Text type='secondary'>{request.entity.id}</Text>
                        </Col>
                        <Col span={6} className='cvat-requests-name'>
                            {request.entity.name}
                        </Col>
                        <Col span={10} className='cvat-task-item-progress-wrapper'>
                            <div style={{'display': 'flex', 'justifyContent': 'space-between', 'marginRight': 0}}>
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
                                {
                                    request.url ? <a target='_blank' download href={request.url}>Click to download</a> : null
                                }
                            </div>
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
                        </Col>
                        <Col span={2} className='cvat-requests-percent'>
                            {request.status === RQStatus.FINISHED ? 100 : request.progress}
                            {request.status === RQStatus.FAILED ? '' : '%'}
                        </Col>
                    </Row>
                </Card>
            </Col>
        </Row>
    );
}
