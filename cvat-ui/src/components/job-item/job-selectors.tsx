// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import Select from 'antd/lib/select';
import { JobStage, JobState } from 'cvat-core-wrapper';
import { handleDropdownKeyDown } from 'utils/dropdown-utils';
import { JobStageLabel, JobStateLabel } from './job-status-visuals';

interface JobStateSelectorProps {
    value: JobState | null;
    onSelect: (newValue: JobState) => void;
}

export function JobStateSelector({ value, onSelect }: Readonly<JobStateSelectorProps>): JSX.Element {
    return (
        <Select
            className='cvat-job-item-state'
            popupClassName='cvat-job-item-state-dropdown'
            value={value}
            onChange={onSelect}
            onKeyDown={handleDropdownKeyDown}
            placeholder='Select a state'
        >
            <Select.Option value={JobState.NEW}>
                <JobStateLabel state={JobState.NEW} />
            </Select.Option>
            <Select.Option value={JobState.IN_PROGRESS}>
                <JobStateLabel state={JobState.IN_PROGRESS} />
            </Select.Option>
            <Select.Option value={JobState.REJECTED}>
                <JobStateLabel state={JobState.REJECTED} />
            </Select.Option>
            <Select.Option value={JobState.COMPLETED}>
                <JobStateLabel state={JobState.COMPLETED} />
            </Select.Option>
        </Select>
    );
}

interface JobStageSelectorProps {
    value: JobStage | null;
    onSelect: (newValue: JobStage) => void;
}

export function JobStageSelector({ value, onSelect }: Readonly<JobStageSelectorProps>): JSX.Element {
    return (
        <Select
            className='cvat-job-item-stage'
            popupClassName='cvat-job-item-stage-dropdown'
            value={value}
            onChange={onSelect}
            onKeyDown={handleDropdownKeyDown}
            placeholder='Select a stage'
        >
            <Select.Option value={JobStage.ANNOTATION}>
                <JobStageLabel stage={JobStage.ANNOTATION} />
            </Select.Option>
            <Select.Option value={JobStage.VALIDATION}>
                <JobStageLabel stage={JobStage.VALIDATION} />
            </Select.Option>
            <Select.Option value={JobStage.ACCEPTANCE}>
                <JobStageLabel stage={JobStage.ACCEPTANCE} />
            </Select.Option>
        </Select>
    );
}
