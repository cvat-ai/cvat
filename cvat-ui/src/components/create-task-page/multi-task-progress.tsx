// Copyright (C) 2022 CVAT.ai Corporation
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
import { useMemo } from 'react';

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

    const counts = useMemo(() => items.reduce(
        (acc, item) => ({
          ...acc,
          [item.status]: acc[item.status] + 1
        }),
        {
          pending: 0,
          progress: 0,
          completed: 0,
          failed: 0,
          cancelled: 0
        }
      ), [items]);

    const countAll = items.length;

    const percent = countAll ?
        Math.ceil(((countAll - (counts.pending + counts.progress)) / countAll) * 100) :
        0;

    const failedFiles: string[] = percent === 100 && counts.failed ?
        items.filter((item) => item.status === 'failed')
            .map((item): string => {
                const tabs = Object.keys(item.files);
                const itemType = tabs.find((key) => (item.files[key][0])) || 'local';
                return item.files[itemType][0]?.name || item.files[itemType][0] || '';
            })
            .filter(Boolean) :
        [];

    if (percent === 100) {
        if (counts.failed === countAll) {
            alertType = 'error';
        } else if (counts.failed) {
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
                                Finished
                            </Col>
                        </Row>
                    ) : null}
                    <Row className='cvat-create-multi-tasks-progress'>
                        <Col>
                            {`Pending: ${counts.pending} `}
                        </Col>
                        <Col offset={1}>
                            {`Progress: ${counts.progress} `}
                        </Col>
                        <Col offset={1}>
                            {`Completed: ${counts.completed} `}
                        </Col>
                        <Col offset={1}>
                            {`Failed: ${counts.failed} `}
                        </Col>
                        {counts.cancelled ? (<Col offset={1}>{`Cancelled: ${counts.cancelled} `}</Col>) : null}
                        <Col offset={1}>
                            {`Total: ${countAll}.`}
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
                    {percent === 100 && counts.failed ? (
                        <Row>
                            <Collapse style={{
                                width: '100%',
                                marginBottom: 5,
                            }}
                            >
                                <Collapse.Panel
                                    header={(
                                        <Text strong>
                                            Failed files
                                        </Text>
                                    )}
                                    key='appearance'
                                >
                                    <List
                                        size='small'
                                        dataSource={failedFiles}
                                        renderItem={(item: string) => <List.Item>{ item }</List.Item>}
                                    />
                                </Collapse.Panel>
                            </Collapse>
                        </Row>
                    ) : null }
                    <Row justify='end' gutter={5}>
                        {percent === 100 ?
                            (
                                <>
                                    <Col>
                                        <Button disabled={!counts.failed} onClick={onRetryFailedTasks}>
                                            Retry failed tasks
                                        </Button>
                                    </Col>
                                    {
                                        counts.cancelled ? (
                                            <Col>
                                                <Button disabled={!counts.cancelled} onClick={onRetryCancelledTasks}>
                                                    Retry cancelled tasks
                                                </Button>
                                            </Col>
                                        ) : null
                                    }
                                    <Col>
                                        <Button type='primary' onClick={onOk}>
                                            Ok
                                        </Button>
                                    </Col>
                                </>
                            ) : (
                                <Col>
                                    <Button onClick={onCancel} disabled={!counts.pending}>
                                        Cancel pending tasks
                                    </Button>
                                </Col>
                            )}
                    </Row>
                </div>
            )}
        />
    );
}
