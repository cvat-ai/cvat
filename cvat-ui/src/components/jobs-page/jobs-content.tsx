// Copyright (C) 2022 Intel Corporation
// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { useSelector } from 'react-redux';
import { Col, Row } from 'antd/lib/grid';
import { CombinedState } from 'reducers';
import { Job, JobType } from 'cvat-core-wrapper';
import JobCard from './job-card';

interface Props {
    onJobUpdate(job: Job): void;
}

function JobsContentComponent(props: Props): JSX.Element {
    const { onJobUpdate } = props;
    const jobs = useSelector((state: CombinedState) => state.jobs.current);
    const dimensions = {
        md: 22,
        lg: 18,
        xl: 16,
        xxl: 16,
    };

    return (
        <Row justify='center' align='middle'>
            <Col className='cvat-jobs-page-list' {...dimensions}>
                {jobs.filter((job: Job) => job.type === JobType.ANNOTATION).map((job: Job): JSX.Element => (
                    <JobCard onJobUpdate={onJobUpdate} job={job} key={job.id} />
                ))}
            </Col>
        </Row>
    );
}

export default React.memo(JobsContentComponent);
