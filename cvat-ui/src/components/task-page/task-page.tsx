// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React, { useEffect, useMemo, useState } from 'react';
import { useHistory, useParams } from 'react-router';
import { useDispatch, useSelector } from 'react-redux';
import { shallowEqual } from 'utils/redux';
import { Row, Col } from 'antd/lib/grid';
import Spin from 'antd/lib/spin';
import Alert from 'antd/lib/alert';
import Empty from 'antd/lib/empty';
import notification from 'antd/lib/notification';
import { Bar } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    BarElement,
    CategoryScale,
    Legend,
    LinearScale,
    Tooltip,
} from 'chart.js';

import { getInferenceStatusAsync } from 'actions/models-actions';
import { updateJobAsync, jobsActions } from 'actions/jobs-actions';
import {
    getCore, Task, Job, FramesMetaData, MediaType,
} from 'cvat-core-wrapper';
import { TaskNotFoundComponent } from 'components/common/not-found';
import JobListComponent from 'components/task-page/job-list';
import ModelRunnerModal from 'components/model-runner-modal/model-runner-dialog';
import CVATLoadingSpinner from 'components/common/loading-spinner';
import MoveTaskModal from 'components/move-task-modal/move-task-modal';
import AddReplicasModal from 'components/jobs-page/add-replicas-modal';
import { CombinedState } from 'reducers';
import { updateTaskAsync, updateTaskMetadataAsync } from 'actions/tasks-actions';
import TopBarComponent from './top-bar';
import DetailsComponent from './details';
import { getCloudStorageById } from './cloud-storage-editor';

const core = getCore();

ChartJS.register(
    BarElement,
    CategoryScale,
    LinearScale,
    Legend,
    Tooltip,
);

interface AnnotationCount {
    label_id: number;
    label_name: string;
    count: number;
}

function TaskPageComponent(): JSX.Element {
    const history = useHistory();
    const id = +useParams<{ id: string }>().id;
    const dispatch = useDispatch();
    const [taskInstance, setTaskInstance] = useState<Task | null>(null);
    const [taskMeta, setTaskMeta] = useState<FramesMetaData | null>(null);
    const [
        cloudStorageInstance, setCloudStorageInstance,
    ] = useState<CombinedState['cloudStorages']['current'][number] | null>(null);
    const [fetchingTask, setFetchingTask] = useState(true);
    const [annotationCounts, setAnnotationCounts] = useState<AnnotationCount[]>([]);
    const [fetchingAnnotationCounts, setFetchingAnnotationCounts] = useState(false);
    const [annotationCountsError, setAnnotationCountsError] = useState<string | null>(null);

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
        if (!taskInstance) {
            return;
        }

        const fetchCounts = async (): Promise<void> => {
            setFetchingAnnotationCounts(true);
            setAnnotationCountsError(null);

            try {
                const response = await fetch(`/api/tasks/${taskInstance.id}/annotation_counts`);
                if (!response.ok) {
                    throw new Error(`Request failed with status ${response.status}`);
                }

                const data = await response.json() as { counts?: AnnotationCount[] };
                setAnnotationCounts(data.counts ?? []);
            } catch (error: any) {
                const message = error instanceof Error ? error.message : 'Unknown error';
                setAnnotationCountsError(message);
                setAnnotationCounts([]);
            } finally {
                setFetchingAnnotationCounts(false);
            }
        };

        fetchCounts();
    }, [taskInstance]);

    useEffect(() => {
        if (taskInstance && id in deletes && deletes[id]) {
            history.push('/tasks');
        }
    }, [deletes]);

    const isAudioTask = taskInstance && taskInstance.mediaType === MediaType.AUDIO;
    const labelsEditorProps = useMemo(() => (isAudioTask ? {
        enableSkeletonCreator: false,
        enableFromModelCreator: false,
        showLabelType: false,
    } : undefined), [isAudioTask]);

    if (fetchingTask) {
        return <Spin size='large' className='cvat-spinner' />;
    }

    if (!taskInstance) {
        return <TaskNotFoundComponent />;
    }

    const onUpdateTask = (task: Task, fields: Parameters<Task['save']>[0] = {}): Promise<Task> => {
        const promise = dispatch(updateTaskAsync(task, fields));
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

    const hasAnnotationCounts = annotationCounts.some(({ count }) => count > 0);

    const chartData = useMemo(() => {
        const labels = annotationCounts.map(({ label_name: labelName }) => labelName);
        const counts = annotationCounts.map(({ count }) => count);

        return {
            labels,
            datasets: [{
                label: 'Annotations',
                data: counts,
                backgroundColor: 'rgba(24, 144, 255, 0.7)',
                borderColor: 'rgba(24, 144, 255, 1)',
                borderWidth: 1,
            }],
        };
    }, [annotationCounts]);

    const chartOptions = useMemo(() => ({
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false,
            },
            tooltip: {
                callbacks: {
                    label: (context: any): string => `${context.parsed.y} annotations`,
                },
            },
        },
        scales: {
            x: {
                ticks: {
                    autoSkip: false,
                },
            },
            y: {
                beginAtZero: true,
                ticks: {
                    precision: 0,
                },
            },
        },
    }), []);

    const renderAnnotationCounts = (): JSX.Element => {
        if (fetchingAnnotationCounts) {
            return <Spin size='small' />;
        }

        if (annotationCountsError) {
            return (
                <Alert
                    message='Could not load annotation counts'
                    description={annotationCountsError}
                    type='error'
                    showIcon
                />
            );
        }

        if (!hasAnnotationCounts) {
            return <Empty description='No annotations have been created for this task yet.' />;
        }

        return (
            <div className='cvat-task-annotation-chart-body'>
                <Bar data={chartData} options={chartOptions} />
            </div>
        );
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
                        labelsEditorProps={labelsEditorProps}
                    />
                    <div className='cvat-task-annotation-chart'>
                        <h3 className='cvat-task-annotation-chart-title'>Annotation counts</h3>
                        {renderAnnotationCounts()}
                    </div>
                    <JobListComponent task={taskInstance} onJobUpdate={onJobUpdate} />
                </Col>
            </Row>
            <ModelRunnerModal />
            <MoveTaskModal onUpdateTask={onUpdateTask} />
            <AddReplicasModal fetchJobs={receiveTask} />
        </div>
    );
}

export default React.memo(TaskPageComponent);
