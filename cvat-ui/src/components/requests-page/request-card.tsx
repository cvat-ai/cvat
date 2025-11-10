// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { Link } from 'react-router-dom';
import dayjs from 'dayjs';

import { Row, Col } from 'antd/lib/grid';
import Card from 'antd/lib/card';
import Text from 'antd/lib/typography/Text';
import Progress from 'antd/lib/progress';
import { MoreOutlined } from '@ant-design/icons';
import Button from 'antd/lib/button';

import { RQStatus, Request } from 'cvat-core-wrapper';
import { useContextMenuClick } from 'utils/hooks';

import StatusMessage from './request-status';
import RequestActionsComponent from './actions-menu';

export interface Props {
    request: Request;
    cancelled: boolean;
    selected?: boolean;
    onClick?: (event?: React.MouseEvent) => void;
}

function constructLink(request: Request): string | null {
    const {
        type, target, jobID, taskID, projectID,
    } = request.operation;

    if (request.status === RQStatus.FAILED && type.includes('create')) {
        return null;
    }

    if (target === 'project' && projectID) {
        return `/projects/${projectID}`;
    }
    if (target === 'task' && taskID) {
        return `/tasks/${taskID}`;
    }
    if (target === 'job' && jobID) {
        return `/tasks/${taskID}/jobs/${jobID}`;
    }
    return null;
}

function constructName(operation: Request['operation']): string | null {
    const {
        target, jobID, taskID, projectID,
    } = operation;

    if (target === 'project' && projectID) {
        return `Project #${projectID}`;
    }
    if (target === 'task' && taskID) {
        return `Task #${taskID}`;
    }
    if (target === 'job' && jobID) {
        return `Job #${jobID}`;
    }
    return null;
}

function constructTimestamps(request: Request): JSX.Element {
    const started = dayjs(request.startedDate).format('MMM Do YY, H:mm');
    const finished = dayjs(request.finishedDate).format('MMM Do YY, H:mm');
    const created = dayjs(request.createdDate).format('MMM Do YY, H:mm');
    const expired = dayjs(request.expiryDate).format('MMM Do YY, H:mm');
    const { operation: { type }, url } = request;

    switch (request.status) {
        case RQStatus.FINISHED: {
            const exportToCloudStorage = type.includes('export') && !url;
            if (request.expiryDate && !type.includes('create') && !type.includes('import') && !exportToCloudStorage) {
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
            return (request.startedDate ? (
                <Row>
                    <Text type='secondary'>{`Started by ${request.owner.username} on ${started}`}</Text>
                </Row>
            ) : (
                <Row>
                    <Text type='secondary'>{`Enqueued by ${request.owner.username} on ${created}`}</Text>
                </Row>
            ));
        }
        case RQStatus.STARTED: {
            return (
                <>
                    <Row>
                        <Text type='secondary'>{`Enqueued by ${request.owner.username} on ${created}`}</Text>
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
                    <Text type='secondary'>{`Enqueued by ${request.owner.username} on ${created}`}</Text>
                </Row>
            );
        }
    }
}

const dimensions = {
    xs: 6,
    sm: 6,
    md: 8,
    lg: 8,
    xl: 8,
    xxl: 6,
};

function RequestCard(props: Readonly<Props>): JSX.Element {
    const {
        request, cancelled, selected, onClick,
    } = props;
    const { operation } = request;
    const { itemRef, handleContextMenuClick } = useContextMenuClick<HTMLDivElement>();
    const { type } = operation;

    const linkToEntity = constructLink(request);
    const percent = request.status === RQStatus.FINISHED ? 100 : (request.progress ?? 0) * 100;
    const timestamps = constructTimestamps(request);

    const name = constructName(operation);

    const percentProgress = (request.status === RQStatus.FAILED || !percent) ? '' : `${percent.toFixed(2)}%`;

    const style: React.CSSProperties = {};
    if (cancelled) {
        style.pointerEvents = 'none';
        style.opacity = 0.5;
    }

    return (
        <RequestActionsComponent
            requestInstance={request}
            dropdownTrigger={['contextMenu']}
            triggerElement={(menuItems) => (
                <Card
                    ref={itemRef}
                    className={
                        `cvat-requests-card${selected ? ' cvat-item-selected' : ''}`
                    }
                    style={style}
                    onClick={onClick}
                >
                    <Row justify='space-between'>
                        <Col span={12}>
                            <Row style={{ paddingBottom: [RQStatus.FAILED].includes(request.status) ? '10px' : '0' }}>
                                <Col className='cvat-requests-type' {...dimensions}>
                                    <Text>
                                        {type.split(':').map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                                        {' '}
                                    </Text>
                                </Col>
                                {name && (
                                    <Col className='cvat-requests-name'>
                                        {linkToEntity ?
                                            (<Link to={linkToEntity}>{name}</Link>) :
                                            <Text>{name}</Text>}
                                    </Col>
                                )}
                            </Row>
                            {timestamps}
                        </Col>
                        <Col span={10} className='cvat-request-item-progress-wrapper'>
                            <Row>
                                <Col span={21}>
                                    <Row />
                                    <StatusMessage
                                        message={request.message}
                                        status={request.status}
                                        cancelled={cancelled}
                                    />
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
                                            {percentProgress}
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
                                    {
                                        operation?.lightweight ? (
                                            <Row>
                                                <Col className='cvat-lightweight-label'>
                                                    <Text type='secondary'>Lightweight backup</Text>
                                                </Col>
                                            </Row>
                                        ) : null
                                    }
                                </Col>
                                <Col span={3} style={{ display: 'flex', justifyContent: 'end' }}>
                                    {
                                        (menuItems.length > 0) ? (
                                            <Button
                                                type='link'
                                                size='middle'
                                                className='cvat-requests-page-actions-button cvat-actions-menu-button'
                                                icon={<MoreOutlined className='cvat-menu-icon' />}
                                                onClick={handleContextMenuClick}
                                            />
                                        ) : null
                                    }
                                </Col>
                            </Row>
                        </Col>
                    </Row>
                </Card>
            )}
        />

    );
}

export default React.memo(RequestCard);
