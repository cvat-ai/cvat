// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import '../styles.scss';

import React, { useEffect } from 'react';
import {
    Job, JobType, Task,
} from 'cvat-core-wrapper';
import { Row } from 'antd/lib/grid';
import Text from 'antd/lib/typography/Text';
import JobItem from 'components/job-item/job-item';
import { useDispatch, useSelector } from 'react-redux';
import { getQualityReportsAsync } from 'actions/analytics-actions';
import { CombinedState } from 'reducers';
import EmptyQuality from './empty-quality';
import MeanQuality from './mean-quality';
import JobList from './job-list';
import GtConflicts from './gt-conflicts';
import Issues from './issues';

interface Props {
    task: Task,
    onJobUpdate: (job: Job) => void
}

function TaskQualityComponent(props: Props): JSX.Element {
    const { task, onJobUpdate } = props;
    const dispatch = useDispatch();
    const query = useSelector((state: CombinedState) => state.analytics.quality.query);

    useEffect(() => {
        dispatch(getQualityReportsAsync(task, { ...query, taskId: task.id }));
    }, []);

    const gtJob = task.jobs.find((job: Job) => job.type === JobType.GROUND_TRUTH);
    if (!gtJob) {
        return (<EmptyQuality taskId={task.id} />);
    }

    return (
        <div className='cvat-task-quality-page'>
            <Row>
                <MeanQuality task={task} />
            </Row>
            <Row gutter={16}>
                <GtConflicts task={task} />
                <Issues task={task} />
            </Row>
            <Row>
                <Text type='secondary' className='cvat-task-quality-reports-hint'>
                    Quality reports are not computed unless the GT job is in the accepted state.
                </Text>
            </Row>
            <Row>
                <JobItem job={gtJob} onJobUpdate={onJobUpdate} />
            </Row>
            <Row>
                <JobList task={task} />
            </Row>
        </div>
    );
}

export default React.memo(TaskQualityComponent);
