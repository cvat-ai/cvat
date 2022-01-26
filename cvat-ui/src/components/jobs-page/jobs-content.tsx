// Copyright (C) 2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { useSelector } from 'react-redux';
import { Col, Row } from 'antd/lib/grid';
import { CombinedState } from 'reducers/interfaces';
import JobCard from './job-card';

function JobsContentComponent(): JSX.Element {
    const jobs = useSelector((state: CombinedState) => state.jobs.current);
    const previews = useSelector((state: CombinedState) => state.jobs.previews);
    const dimensions = {
        md: 22,
        lg: 18,
        xl: 16,
        xxl: 16,
    };

    return (
        <Row justify='center' align='middle'>
            <Col className='cvat-jobs-page-list' {...dimensions}>
                {jobs.map((job: any, idx: number): JSX.Element => (
                    <JobCard preview={previews[idx]} job={job} key={job.id} />
                ))}
            </Col>
        </Row>
    );
}

export default React.memo(JobsContentComponent);
