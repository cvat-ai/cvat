// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import Alert from 'antd/lib/alert';
import Progress from 'antd/lib/progress';
import Row from 'antd/lib/row';
import Col from 'antd/lib/col';
import Button from 'antd/lib/button';
import Collapse from 'antd/lib/collapse';
import Text from 'antd/lib/typography/Text';
import List from 'antd/lib/list';

interface Props {
    tasks: any[];
    onCancel: () => void;
    onOk: () => void;
    onRetryFailedTasks: () => void;
    onRetryCancelledTasks: () => void;
}

export default function MultiTasksProgress(props: Props): JSX.Element {
    const {
        tasks: items,
        onOk,
        onCancel,
        onRetryFailedTasks,
        onRetryCancelledTasks,
    } = props;
    let alertType: any = 'info';

    const countPending = items.filter((item) => item.status === 'pending').length;
    const countProgress = items.filter((item) => item.status === 'progress').length;
    const countCompleted = items.filter((item) => item.status === 'completed').length;
    const countFailed = items.filter((item) => item.status === 'failed').length;
    const countCancelled = items.filter((item) => item.status === 'cancelled').length;
    const countAll = items.length;
    const percent = countAll ?
        Math.ceil(((countAll - (countPending + countProgress)) / countAll) * 100) :
        0;

    const failedFiles: string[] = percent === 100 && countFailed ?
        items.filter((item) => item.status === 'failed')
            .map((item): string => {
                const tabs = Object.keys(item.files);
                const itemType = tabs.find((key) => (item.files[key][0])) || 'local';
                return item.files[itemType][0]?.name || item.files[itemType][0] || '';
            })
            .filter(Boolean) :
        [];

    if (percent === 100) {
        if (countFailed === countAll) {
            alertType = 'error';
        } else if (countFailed) {
            alertType = 'warning';
        }
    }

    return (
        <Alert
            type={alertType}
            message={(
                <div>
                    {percent === 100 ? (
                        <Row className='cvat-create-multi-tasks-state'>
                            <Col>
                                已完成
                            </Col>
                        </Row>
                    ) : null}
                    <Row className='cvat-create-multi-tasks-progress'>
                        <Col>
                            {`等待中: ${countPending} `}
                        </Col>
                        <Col offset={1}>
                            {`进行中: ${countProgress} `}
                        </Col>
                        <Col offset={1}>
                            {`已完成: ${countCompleted} `}
                        </Col>
                        <Col offset={1}>
                            {`失败: ${countFailed} `}
                        </Col>
                        {countCancelled ? (<Col offset={1}>{`已取消: ${countCancelled} `}</Col>) : null}
                        <Col offset={1}>
                            {`总计: ${countAll}`}
                        </Col>
                    </Row>
                    <Progress
                        status='normal'
                        percent={percent}
                        strokeWidth={5}
                        size='small'
                        trailColor='#d8d8d8'
                    />
                    <br />
                    {percent === 100 && countFailed ? (
                        <Row>
                            <Collapse
                                style={{
                                    width: '100%',
                                    marginBottom: 5,
                                }}
                                items={[{
                                    key: 'appearance',
                                    label: <Text strong> 失败的文件 </Text>,
                                    children: (
                                        <List
                                            size='small'
                                            dataSource={failedFiles}
                                            renderItem={(item: string) => <List.Item>{ item }</List.Item>}
                                        />
                                    ),
                                }]}
                            />
                        </Row>
                    ) : null }
                    <Row justify='end' gutter={5}>
                        {percent === 100 ?
                            (
                                <>
                                    <Col>
                                        <Button
                                            className='cvat-create-multiple-tasks-retry-failed-button'
                                            disabled={!countFailed}
                                            onClick={onRetryFailedTasks}
                                        >
                                            重试失败的任务
                                        </Button>
                                    </Col>
                                    {
                                        countCancelled ? (
                                            <Col>
                                                <Button
                                                    className='cvat-create-multiple-tasks-retry-cancelled-button'
                                                    disabled={!countCancelled}
                                                    onClick={onRetryCancelledTasks}
                                                >
                                                    重试已取消的任务
                                                </Button>
                                            </Col>
                                        ) : null
                                    }
                                    <Col>
                                        <Button
                                            className='cvat-create-multiple-tasks-after-finish-button'
                                            type='primary'
                                            onClick={onOk}
                                        >
                                            确定
                                        </Button>
                                    </Col>
                                </>
                            ) : (
                                <Col>
                                    <Button
                                        className='cvat-create-multiple-tasks-cancel-pending-button'
                                        onClick={onCancel}
                                        disabled={!countPending}
                                    >
                                        取消等待中的任务
                                    </Button>
                                </Col>
                            )}
                    </Row>
                </div>
            )}
        />
    );
}
