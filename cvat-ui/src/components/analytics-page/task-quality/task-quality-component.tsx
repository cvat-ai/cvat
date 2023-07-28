// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import '../styles.scss';

import { getQualitySettingsAsync, getTaskQualityReportsAsync } from 'actions/analytics-actions';
import { Row } from 'antd/lib/grid';
import Text from 'antd/lib/typography/Text';
import CVATLoadingSpinner from 'components/common/loading-spinner';
import JobItem from 'components/job-item/job-item';
import { Job, JobType, Task } from 'cvat-core-wrapper';
import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { CombinedState } from 'reducers';
import { useIsMounted } from 'utils/hooks';
import EmptyGtJob from './empty-job';
import GtConflicts from './gt-conflicts';
import Issues from './issues';
import JobList from './job-list';
import MeanQuality from './mean-quality';
import QualitySettingsModal from './quality-settings-modal';

interface Props {
    task: Task,
    onJobUpdate: (job: Job) => void
}

function TaskQualityComponent(props: Props): JSX.Element {
    const { task, onJobUpdate } = props;
    const dispatch = useDispatch();
    const isMounted = useIsMounted();
    const query = useSelector((state: CombinedState) => state.analytics.quality.query);

    const [fetching, setFetching] = useState<boolean>(true);

    useEffect(() => {
        Promise.all([
            dispatch(getTaskQualityReportsAsync(task, { ...query, taskId: task.id })),
            dispatch(getQualitySettingsAsync({
                ...(!task.projectId ? { taskId: task.id } : {}),
                ...(task.projectId ? { projectId: task.projectId } : {}),
            }, !task.projectId)),
        ]).finally(() => {
            if (isMounted()) {
                setFetching(false);
            }
        });
    }, [task?.id]);

    const gtJob = task.jobs.find((job: Job) => job.type === JobType.GROUND_TRUTH);

    return (
        <div className='cvat-task-quality-page'>
            {
                fetching ? (
                    <CVATLoadingSpinner size='large' />
                ) : (
                    <>
                        {
                            gtJob ? (
                                <>
                                    <Row>
                                        <MeanQuality task={task} />
                                    </Row>
                                    <Row gutter={16}>
                                        <GtConflicts task={task} />
                                        <Issues task={task} />
                                    </Row>
                                    {
                                        (!(gtJob && gtJob.stage === 'acceptance' && gtJob.state === 'completed')) ? (
                                            <Row>
                                                <Text type='secondary' className='cvat-task-quality-reports-hint'>
                                                    Quality reports are not computed unless the GT job is in the&nbsp;
                                                    <strong>completed state</strong>
                                                    &nbsp;and&nbsp;
                                                    <strong>acceptance stage.</strong>
                                                </Text>
                                            </Row>
                                        ) : null
                                    }
                                    <Row>
                                        <JobItem job={gtJob} task={task} onJobUpdate={onJobUpdate} />
                                    </Row>
                                    <Row>
                                        <JobList task={task} />
                                    </Row>
                                </>
                            ) : (
                                <Row justify='center'>
                                    <EmptyGtJob taskId={task.id} />
                                </Row>
                            )
                        }
                        <QualitySettingsModal task={task} />
                    </>
                )
            }
        </div>
    );
}

export default React.memo(TaskQualityComponent);
