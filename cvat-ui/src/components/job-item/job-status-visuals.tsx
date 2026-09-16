// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import Tag from 'antd/lib/tag';
import Space from 'antd/lib/space';
import {
    CheckCircleOutlined,
    CloseCircleOutlined,
    EditOutlined,
    EyeOutlined,
    FileOutlined,
    SyncOutlined,
} from '@ant-design/icons';
import { JobStage, JobState } from 'cvat-core-wrapper';

import './job-status-visuals.scss';

export function JobStageIcon({ stage }: Readonly<{ stage: JobStage }>): JSX.Element {
    switch (stage) {
        case JobStage.VALIDATION:
            return <EyeOutlined />;
        case JobStage.ACCEPTANCE:
            return <CheckCircleOutlined />;
        case JobStage.ANNOTATION:
        default:
            return <EditOutlined />;
    }
}

export function JobStateIcon({ state }: Readonly<{ state: JobState }>): JSX.Element {
    switch (state) {
        case JobState.IN_PROGRESS:
            return <SyncOutlined />;
        case JobState.COMPLETED:
            return <CheckCircleOutlined />;
        case JobState.REJECTED:
            return <CloseCircleOutlined />;
        case JobState.NEW:
        default:
            return <FileOutlined />;
    }
}

function stageClassName(stage: JobStage): string {
    switch (stage) {
        case JobStage.VALIDATION:
            return 'cvat-job-stage-tag-validation';
        case JobStage.ACCEPTANCE:
            return 'cvat-job-stage-tag-acceptance';
        case JobStage.ANNOTATION:
        default:
            return 'cvat-job-stage-tag-annotation';
    }
}

function stateClassName(state: JobState): string {
    switch (state) {
        case JobState.IN_PROGRESS:
            return 'cvat-job-state-tag-in-progress';
        case JobState.COMPLETED:
            return 'cvat-job-state-tag-completed';
        case JobState.REJECTED:
            return 'cvat-job-state-tag-rejected';
        case JobState.NEW:
        default:
            return 'cvat-job-state-tag-new';
    }
}

interface JobStageLabelProps {
    stage: JobStage;
}

export function JobStageLabel({ stage }: Readonly<JobStageLabelProps>): JSX.Element {
    return (
        <span className={`cvat-job-stage-label ${stageClassName(stage)}`}>
            <JobStageIcon stage={stage} />
            <span>{stage}</span>
        </span>
    );
}

interface JobStateLabelProps {
    state: JobState;
}

export function JobStateLabel({ state }: Readonly<JobStateLabelProps>): JSX.Element {
    return (
        <span className={`cvat-job-state-label ${stateClassName(state)}`}>
            <JobStateIcon state={state} />
            <span>{state}</span>
        </span>
    );
}

interface JobStageStateBadgesProps {
    stage: JobStage;
    state: JobState;
}

function JobStageStateBadges({ stage, state }: Readonly<JobStageStateBadgesProps>): JSX.Element {
    return (
        <Space size={4} wrap className='cvat-job-stage-state-badges'>
            <Tag className={`cvat-job-stage-tag ${stageClassName(stage)}`} icon={<JobStageIcon stage={stage} />}>
                {stage}
            </Tag>
            <Tag className={`cvat-job-state-tag ${stateClassName(state)}`} icon={<JobStateIcon state={state} />}>
                {state}
            </Tag>
        </Space>
    );
}

export default React.memo(JobStageStateBadges);
