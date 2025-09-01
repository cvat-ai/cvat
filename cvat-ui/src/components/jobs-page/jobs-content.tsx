// Copyright (C) 2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { useSelector } from 'react-redux';
import { Col, Row } from 'antd/lib/grid';
import { CombinedState, SelectedResourceType } from 'reducers';
import { Job } from 'cvat-core-wrapper';
import dimensions from 'utils/dimensions';
import BulkWrapper from 'components/bulk-wrapper';
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

    const jobIdToIndex = new Map<number, number>();
    jobs.forEach((j, idx) => jobIdToIndex.set(j.id, idx));

    return (
        <Row justify='center' align='middle' className='cvat-resource-list-wrapper'>
            <Col className='cvat-jobs-page-list' {...dimensions}>
                <BulkWrapper currentResourceIds={jobs.map((j) => j.id)} resourceType={SelectedResourceType.JOBS}>
                    {(selectProps) => {
                        const renderJobRow = (jobInstances: Job[]): JSX.Element => (
                            <Row key={jobInstances[0].id} className='cvat-jobs-list-row'>
                                {jobInstances.map((job: Job) => {
                                    const globalIdx = jobIdToIndex.get(job.id) ?? 0;
                                    return (
                                        <Col span={6} key={job.id}>
                                            <JobCard
                                                key={job.id}
                                                job={job}
                                                {...selectProps(job.id, globalIdx)}
                                            />
                                        </Col>
                                    );
                                })}
                            </Row>
                        );
                        return groupedJobs.map(renderJobRow);
                    }}
                </BulkWrapper>
            </Col>
        </Row>
    );
}

export default React.memo(JobsContentComponent);
