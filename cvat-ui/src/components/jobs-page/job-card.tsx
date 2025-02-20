// Copyright (C) 2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { useSelector } from 'react-redux';
import { useHistory } from 'react-router';
import Card from 'antd/lib/card';
import Descriptions from 'antd/lib/descriptions';
import { MoreOutlined } from '@ant-design/icons';
import Dropdown from 'antd/lib/dropdown';

import { Job, JobType } from 'cvat-core-wrapper';
import { useCardHeightHOC } from 'utils/hooks';
import Preview from 'components/common/preview';
import JobActionsMenu from 'components/job-item/job-actions-menu';
import { CombinedState } from 'reducers';

const useCardHeight = useCardHeightHOC({
    containerClassName: 'cvat-jobs-page',
    siblingClassNames: ['cvat-jobs-page-pagination', 'cvat-jobs-page-top-bar'],
    paddings: 64,
    minHeight: 200,
    numberOfRows: 3,
});

interface Props {
    job: Job;
}

function JobCardComponent(props: Props): JSX.Element {
    const { job } = props;

    const deletes = useSelector((state: CombinedState) => state.jobs.activities.deletes);
    const deleted = job.id in deletes ? deletes[job.id] === true : false;

    const history = useHistory();
    const height = useCardHeight();
    const onClick = (event: React.MouseEvent): void => {
        const url = `/tasks/${job.taskId}/jobs/${job.id}`;
        if (event.ctrlKey) {
            window.open(url, '_blank', 'noopener noreferrer');
        } else {
            history.push(url);
        }
    };

    const style = {};
    if (deleted) {
        (style as any).pointerEvents = 'none';
        (style as any).opacity = 0.5;
    }

    let tag = null;
    if (job.type === JobType.GROUND_TRUTH) {
        tag = 'Ground truth';
    } else if (job.type === JobType.ANNOTATION && job.consensusReplicas > 0) {
        tag = 'Consensus';
    }

    return (
        <Card
            style={{ ...style, height }}
            className='cvat-job-page-list-item'
            cover={(
                <>
                    <Preview
                        job={job}
                        onClick={onClick}
                        loadingClassName='cvat-job-item-loading-preview'
                        emptyPreviewClassName='cvat-job-item-empty-preview'
                        previewWrapperClassName='cvat-jobs-page-job-item-card-preview-wrapper'
                        previewClassName='cvat-jobs-page-job-item-card-preview'
                    />
                    <div className='cvat-job-page-list-item-id'>
                        ID:
                        {` ${job.id}`}
                    </div>
                    {tag && <div className='cvat-job-page-list-item-type'>{tag}</div>}
                    <div className='cvat-job-page-list-item-dimension'>{job.dimension.toUpperCase()}</div>
                </>
            )}
            hoverable
        >
            <Descriptions column={1} size='small'>
                <Descriptions.Item label='Stage and state'>{`${job.stage} ${job.state}`}</Descriptions.Item>
                <Descriptions.Item label='Frames'>{job.stopFrame - job.startFrame + 1}</Descriptions.Item>
                {job.assignee ? (
                    <Descriptions.Item label='Assignee'>{job.assignee.username}</Descriptions.Item>
                ) : (
                    <Descriptions.Item label='Assignee'> </Descriptions.Item>
                )}
            </Descriptions>
            <Dropdown
                trigger={['click']}
                destroyPopupOnHide
                overlay={<JobActionsMenu job={job} />}
            >
                <MoreOutlined className='cvat-job-card-more-button' />
            </Dropdown>
        </Card>
    );
}

export default React.memo(JobCardComponent);
