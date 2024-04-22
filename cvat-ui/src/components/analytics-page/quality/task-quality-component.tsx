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
import { getQualityReportsAsync, getQualitySettingsAsync } from 'actions/analytics-actions';
import { CombinedState } from 'reducers';
import MeanQuality from './mean-quality';
import JobList from './job-list';
import GtConflicts from './gt-conflicts';
import Issues from './issues';
import EmptyGtJob from './empty-job';
import QualitySettingsModal from './quality-settings-modal';

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
        dispatch(getQualitySettingsAsync(task));
    }, []);

    const gtJob = task.jobs.find((job: Job) => job.type === JobType.GROUND_TRUTH);

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
                    Quality reports are not computed unless the GT job is in the&nbsp;
                    <strong>completed state</strong>
                    &nbsp;and&nbsp;
                    <strong>acceptance stage.</strong>
                </Text>
            </Row>
            <Row>
                {gtJob ?
                    <JobItem job={gtJob} task={task} onJobUpdate={onJobUpdate} /> :
                    <EmptyGtJob taskId={task.id} />}
            </Row>
            <Row>
                <JobList task={task} />
            </Row>
            <QualitySettingsModal />
        </div>
    );
}

export default React.memo(TaskQualityComponent);
