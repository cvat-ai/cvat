// Copyright (C) 2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { useSelector } from 'react-redux';
import { Col, Row } from 'antd/lib/grid';
import { CombinedState } from 'reducers';
import { Job } from 'cvat-core-wrapper';
import dimensions from 'utils/dimensions';
import JobCard from './job-card';

function JobsContentComponent(): JSX.Element {
    const jobs = useSelector((state: CombinedState) => state.jobs.current);

    const groupedJobs = jobs.reduce(
        (acc: Job[][], storage: Job, index: number): Job[][] => {
            if (index && index % 4) {
                acc[acc.length - 1].push(storage);
            } else {
                acc.push([storage]);
            }
            return acc;
        },
        [],
    );

    return (
        <Row justify='center' align='middle'>
            <Col className='cvat-jobs-page-list' {...dimensions}>
                {groupedJobs.map(
                    (jobInstances: Job[]): JSX.Element => (
                        <Row key={jobInstances[0].id}>
                            {jobInstances.map((job: Job) => (
                                <Col span={6} key={job.id}>
                                    <JobCard job={job} key={job.id} />
                                </Col>
                            ))}
                        </Row>
                    ),
                )}
            </Col>
        </Row>
    );
}

export default React.memo(JobsContentComponent);
