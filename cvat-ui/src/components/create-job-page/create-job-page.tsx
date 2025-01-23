// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';

import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import { Row, Col } from 'antd/lib/grid';
import Text from 'antd/lib/typography/Text';
import Spin from 'antd/lib/spin';
import notification from 'antd/lib/notification';
import { TaskNotFoundComponent } from 'components/common/not-found';
import { useIsMounted } from 'utils/hooks';
import { getCore, Task } from 'cvat-core-wrapper';
import JobForm from './job-form';

const core = getCore();

function CreateJobPage(): JSX.Element {
    const [fetchingTask, setFetchingTask] = useState(true);
    const [taskInstance, setTaskInstance] = useState<Task | null>(null);
    const isMounted = useIsMounted();

    const id = +useParams<{ id: string }>().id;
    useEffect((): void => {
        if (Number.isInteger(id)) {
            core.tasks.get({ id })
                .then(([task]: Task[]) => {
                    if (isMounted() && task) {
                        setTaskInstance(task);
                    }
                }).catch((error: Error) => {
                    if (isMounted()) {
                        notification.error({
                            message: 'Could not fetch requested task from the server',
                            description: error.toString(),
                        });
                    }
                }).finally(() => {
                    if (isMounted()) {
                        setFetchingTask(false);
                    }
                });
        } else {
            notification.error({
                message: 'Could not receive the requested task from the server',
                description: `Requested task id "${id}" is not valid`,
            });
            setFetchingTask(false);
        }
    }, []);

    if (fetchingTask) {
        return <Spin size='large' className='cvat-spinner' />;
    }

    if (!taskInstance) {
        return <TaskNotFoundComponent />;
    }

    return (
        <div className='cvat-create-job-page'>
            <Row justify='center' align='middle'>
                <Col>
                    <Text className='cvat-title'>Add a new job</Text>
                </Col>
            </Row>
            <Row justify='center' align='top'>
                <Col md={20} lg={16} xl={14} xxl={9}>
                    <JobForm task={taskInstance} />
                </Col>
            </Row>
        </div>
    );
}

export default React.memo(CreateJobPage);
