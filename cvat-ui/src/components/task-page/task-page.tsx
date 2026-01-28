// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React, { useEffect, useState } from 'react';
import { useHistory, useParams } from 'react-router';
import { useDispatch, useSelector, shallowEqual } from 'react-redux';
import { Row, Col } from 'antd/lib/grid';
import Spin from 'antd/lib/spin';
import notification from 'antd/lib/notification';

import { getInferenceStatusAsync } from 'actions/models-actions';
import { updateJobAsync, jobsActions } from 'actions/jobs-actions';
import {
    getCore, Task, Job, FramesMetaData,
} from 'cvat-core-wrapper';
import { TaskNotFoundComponent } from 'components/common/not-found';
import JobListComponent from 'components/task-page/job-list';
import ModelRunnerModal from 'components/model-runner-modal/model-runner-dialog';
import CVATLoadingSpinner from 'components/common/loading-spinner';
import MoveTaskModal from 'components/move-task-modal/move-task-modal';
import { CombinedState, CloudStorage } from 'reducers';
import { updateTaskAsync, updateTaskMetadataAsync } from 'actions/tasks-actions';
import TopBarComponent from './top-bar';
import DetailsComponent from './details';
import { getCloudStorageById } from './cloud-storage-editor';

const core = getCore();

function TaskPageComponent(): JSX.Element {
    const history = useHistory();
    const id = +useParams<{ id: string }>().id;
    const dispatch = useDispatch();
    const [taskInstance, setTaskInstance] = useState<Task | null>(null);
    const [taskMeta, setTaskMeta] = useState<FramesMetaData | null>(null);
    const [cloudStorageInstance, setCloudStorageInstance] = useState<CloudStorage | null>(null);
    const [fetchingTask, setFetchingTask] = useState(true);

    const {
        deletes,
        updates,
        jobsFetching,
        bulkFetching,
    } = useSelector((state: CombinedState) => ({
        deletes: state.tasks.activities.deletes,
        updates: state.tasks.activities.updates,
        jobsFetching: state.jobs.fetching,
        bulkFetching: state.bulkActions.fetching,
    }), shallowEqual);
    const isTaskUpdating = (updates[id] || jobsFetching) && !bulkFetching;

    const receiveTask = async (): Promise<void> => {
        try {
            const [task]: Task[] = await core.tasks.get({ id });

            if (task) {
                setTaskInstance(task);
                dispatch(jobsActions.getJobsSuccess(
                    Object.assign([...task.jobs], { count: task.jobs.length })),
                );

                const meta = await task.meta.get();
                setTaskMeta(meta);

                if (meta.cloudStorageId) {
                    const cloudStorage = await getCloudStorageById(meta.cloudStorageId);
                    setCloudStorageInstance(cloudStorage);
                }
            }
        } catch (error: any) {
            notification.error({
                message: 'Could not receive the requested task from the server',
                description: error.toString(),
            });
        }
    };

    useEffect(() => {
        receiveTask().finally(() => {
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

    const onUpdateTask = (task: Task): Promise<Task> => {
        const promise = dispatch(updateTaskAsync(task, {}));
        promise.then((updatedTask: Task) => {
            setTaskInstance(updatedTask);
        });
        return promise;
    };

    const onUpdateTaskMeta = (meta: FramesMetaData): Promise<void> => (
        dispatch(updateTaskMetadataAsync(taskInstance, meta)).then((updatedMeta: FramesMetaData) => {
            setTaskMeta(updatedMeta);
            if (updatedMeta && updatedMeta.cloudStorageId) {
                return getCloudStorageById(updatedMeta.cloudStorageId);
            }
            return null;
        }).then((_cloudStorage) => {
            setCloudStorageInstance(_cloudStorage);
        })
    );

    const onJobUpdate = (job: Job, data: Parameters<Job['save']>[0]): void => {
        dispatch(updateJobAsync(job, data));
    };

    return (
        <div className='cvat-task-page'>
            { isTaskUpdating ? <CVATLoadingSpinner size='large' /> : null }
            <Row
                justify='center'
                align='top'
                className='cvat-task-details-wrapper'
            >
                <Col span={22} xl={18} xxl={14}>
                    <TopBarComponent taskInstance={taskInstance} onUpdateTask={onUpdateTask} />
                    <DetailsComponent
                        task={taskInstance}
                        onUpdateTask={onUpdateTask}
                        taskMeta={taskMeta}
                        cloudStorageInstance={cloudStorageInstance}
                        onUpdateTaskMeta={onUpdateTaskMeta}
                    />
                    <JobListComponent task={taskInstance} onJobUpdate={onJobUpdate} />
                </Col>
            </Row>
            <ModelRunnerModal />
            <MoveTaskModal onUpdateTask={onUpdateTask} />
        </div>
    );
}

export default React.memo(TaskPageComponent);
