// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import Select from 'antd/lib/select';
import { JobStage, JobState } from 'cvat-core-wrapper';

interface JobStateSelectorProps {
    value: JobState;
    onSelect: (newValue: JobState) => void;
}

export function JobStateSelector({ value, onSelect }: JobStateSelectorProps): JSX.Element {
    return (
        <Select
            className='cvat-job-item-state'
            popupClassName='cvat-job-item-state-dropdown'
            value={value}
            onChange={onSelect}
        >
            <Select.Option value={JobState.NEW}>{JobState.NEW}</Select.Option>
            <Select.Option value={JobState.IN_PROGRESS}>{JobState.IN_PROGRESS}</Select.Option>
            <Select.Option value={JobState.REJECTED}>{JobState.REJECTED}</Select.Option>
            <Select.Option value={JobState.COMPLETED}>{JobState.COMPLETED}</Select.Option>
        </Select>
    );
}

interface JobStageSelectorProps {
    value: JobStage;
    onSelect: (newValue: JobStage) => void;
}

export function JobStageSelector({ value, onSelect }: JobStageSelectorProps): JSX.Element {
    return (
        <Select
            className='cvat-job-item-stage'
            popupClassName='cvat-job-item-stage-dropdown'
            value={value}
            onChange={onSelect}
        >
            <Select.Option value={JobStage.ANNOTATION}>
                {JobStage.ANNOTATION}
            </Select.Option>
            <Select.Option value={JobStage.VALIDATION}>
                {JobStage.VALIDATION}
            </Select.Option>
            <Select.Option value={JobStage.ACCEPTANCE}>
                {JobStage.ACCEPTANCE}
            </Select.Option>
        </Select>
    );
}
