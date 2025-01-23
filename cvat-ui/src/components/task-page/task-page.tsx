// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React, { useEffect, useState } from 'react';
import { useHistory, useParams } from 'react-router';
import { useDispatch, useSelector } from 'react-redux';
import { Row, Col } from 'antd/lib/grid';
import Spin from 'antd/lib/spin';
import notification from 'antd/lib/notification';

import { getInferenceStatusAsync } from 'actions/models-actions';
import { updateJobAsync } from 'actions/jobs-actions';
import { getCore, Task, Job } from 'cvat-core-wrapper';
import { TaskNotFoundComponent } from 'components/common/not-found';
import JobListComponent from 'components/task-page/job-list';
import ModelRunnerModal from 'components/model-runner-modal/model-runner-dialog';
import CVATLoadingSpinner from 'components/common/loading-spinner';
import MoveTaskModal from 'components/move-task-modal/move-task-modal';
import { CombinedState } from 'reducers';
import TopBarComponent from './top-bar';
import DetailsComponent from './details';

const core = getCore();

function TaskPageComponent(): JSX.Element {
    const history = useHistory();
    const id = +useParams<{ id: string }>().id;
    const dispatch = useDispatch();
    const [taskInstance, setTaskInstance] = useState<Task | null>(null);
    const [fetchingTask, setFetchingTask] = useState(true);
    const [updatingTask, setUpdatingTask] = useState(false);

    const deletes = useSelector((state: CombinedState) => state.tasks.activities.deletes);

    const receieveTask = (): Promise<Task[]> => {
        if (Number.isInteger(id)) {
            const promise = core.tasks.get({ id });
            promise.then(([task]: Task[]) => {
                if (task) {
                    setTaskInstance(task);
                }
            }).catch((error: Error) => {
                notification.error({
                    message: 'Could not receive the requested task from the server',
                    description: error.toString(),
                });
            });

            return promise;
        }

        notification.error({
            message: 'Could not receive the requested task from the server',
            description: `Requested task id "${id}" is not valid`,
        });

        return Promise.reject();
    };

    useEffect(() => {
        receieveTask().finally(() => {
            setFetchingTask(false);
        });
        dispatch(getInferenceStatusAsync());
    }, []);

    useEffect(() => {
        if (taskInstance && id in deletes && deletes[id]) {
            history.push('/tasks');
        }
    }, [deletes]);

    if (fetchingTask) {
        return <Spin size='large' className='cvat-spinner' />;
    }

    if (!taskInstance) {
        return <TaskNotFoundComponent />;
    }

    const onUpdateTask = (task: Task): Promise<void> => (
        new Promise((resolve, reject) => {
            setUpdatingTask(true);
            task.save().then((updatedTask: Task) => {
                setTaskInstance(updatedTask);
                resolve();
            }).catch((error: Error) => {
                notification.error({
                    message: 'Could not update the task',
                    className: 'cvat-notification-notice-update-task-failed',
                    description: error.toString(),
                });
                reject();
            }).finally(() => {
                setUpdatingTask(false);
            });
        })
    );

    const onJobUpdate = (job: Job, data: Parameters<Job['save']>[0]): void => {
        setUpdatingTask(true);
        dispatch(updateJobAsync(job, data)).then(() => {
            // if one of jobs changes, task will have its updated_date bumped
            // but generally we do not use this field anywhere on the page
            // so, as a kind of optimization we do not fetch the task again
            setUpdatingTask(false);
        }).catch((error: Error) => {
            setUpdatingTask(false);
            notification.error({
                message: 'Could not update the job',
                description: error.toString(),
            });
        });
    };

    return (
        <div className='cvat-task-page'>
            { updatingTask ? <CVATLoadingSpinner size='large' /> : null }
            <Row
                justify='center'
                align='top'
                className='cvat-task-details-wrapper'
            >
                <Col span={22} xl={18} xxl={14}>
                    <TopBarComponent taskInstance={taskInstance} />
                    <DetailsComponent task={taskInstance} onUpdateTask={onUpdateTask} />
                    <JobListComponent task={taskInstance} onJobUpdate={onJobUpdate} />
                </Col>
            </Row>
            <ModelRunnerModal />
            <MoveTaskModal onUpdateTask={onUpdateTask} />
        </div>
    );
}

export default React.memo(TaskPageComponent);
