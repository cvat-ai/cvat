// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import Select from 'antd/lib/select';

import { Job } from 'cvat-core-wrapper';

interface Props {
    jobs: Job[];
    value: number | undefined;
    disabled: boolean;
    onChange: (jobId: number | undefined) => void;
}

function JobFilter(props: Props): JSX.Element {
    const {
        jobs, value, disabled, onChange,
    } = props;

    return (
        <Select
            size='small'
            className='cvat-label-counts-job-filter'
            value={value}
            placeholder='All jobs'
            allowClear
            disabled={disabled}
            onChange={onChange}
            options={jobs.map((job) => ({
                value: job.id,
                label: `Job #${job.id} (frames ${job.startFrame}-${job.stopFrame})`,
            }))}
        />
    );
}

export default React.memo(JobFilter);
