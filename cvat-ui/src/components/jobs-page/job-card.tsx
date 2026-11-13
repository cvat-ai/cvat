// Copyright (C) 2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useCallback } from 'react';
import { useSelector } from 'react-redux';
import { useHistory } from 'react-router';
import Button from 'antd/lib/button';
import Text from 'antd/lib/typography/Text';
import { MoreOutlined } from '@ant-design/icons';

import { Job, JobType } from 'cvat-core-wrapper';
import { useCardHeightHOC, useContextMenuClick } from 'utils/hooks';
import Preview from 'components/common/preview';
import ResourceCard from 'components/common/resource-card';
import { CombinedState } from 'reducers';
import JobStageStateBadges from 'components/job-item/job-status-visuals';
import JobActionsComponent from './actions-menu';

const useCardHeight = useCardHeightHOC({
    containerClassName: 'cvat-jobs-page',
    siblingClassNames: ['cvat-jobs-page-pagination', 'cvat-jobs-page-top-bar'],
    paddings: 80,
    minHeight: 200,
    numberOfRows: 3,
});

interface Props {
    job: Job;
    selected: boolean;
    onClick: (event: React.MouseEvent) => boolean;
    onApplyFilter?: (filter: string | null) => void;
}

function JobCardComponent(props: Readonly<Props>): JSX.Element {
    const {
        job, selected, onClick, onApplyFilter,
    } = props;

    const deletes = useSelector((state: CombinedState) => state.jobs.activities.deletes);
    const deleted = job.id in deletes ? deletes[job.id] === true : false;

    const history = useHistory();
    const height = useCardHeight();
    const { itemRef, handleContextMenuClick, handleContextMenuCapture } = useContextMenuClick<HTMLDivElement>();
    const jobURL = `/tasks/${job.taskId}/jobs/${job.id}`;
    const assigneeName = job.assignee?.username;
    const handleCardClick = useCallback((event: React.MouseEvent): void => {
        event.stopPropagation();
        const cancel = onClick(event);
        if (!cancel) {
            history.push(jobURL);
        }
    }, [history, jobURL, onClick]);

    let tag = null;
    if (job.type === JobType.GROUND_TRUTH) {
        tag = 'Ground truth';
    } else if (job.replicasCount > 0) {
        tag = 'Parent';
    } else if (job.parentJobId !== null) {
        tag = 'Replica';
    }

    const card = (
        <ResourceCard
            cardRef={itemRef}
            id={job.id}
            preview={(
                <Preview
                    job={job}
                    loadingClassName='cvat-job-item-loading-preview'
                    emptyPreviewClassName='cvat-job-item-empty-preview'
                    previewWrapperClassName='cvat-jobs-page-job-item-card-preview-wrapper'
                    previewClassName='cvat-jobs-page-job-item-card-preview'
                />
            )}
            tags={[
                {
                    key: 'dimension',
                    content: job.dimension.toUpperCase(),
                    className: 'cvat-job-page-list-item-dimension',
                },
                ...(tag ? [{
                    key: 'type',
                    content: tag,
                    className: 'cvat-job-page-list-item-type',
                }] : []),
            ]}
            idClassName='cvat-job-page-list-item-id'
            mediaOverlay={(
                <div className='cvat-job-page-list-item-status'>
                    <JobStageStateBadges stage={job.stage} state={job.state} />
                </div>
            )}
            descriptions={[
                { label: 'Frames', value: job.stopFrame - job.startFrame + 1 },
                {
                    label: 'Assignee',
                    value: (
                        <Text
                            ellipsis={{ tooltip: assigneeName }}
                            className='cvat-resource-card-line'
                        >
                            {assigneeName}
                        </Text>
                    ),
                },
            ]}
            menu={(
                <Button
                    type='text'
                    onClick={handleContextMenuClick}
                    className='cvat-job-card-more-button cvat-actions-menu-button'
                    icon={<MoreOutlined className='cvat-menu-icon' />}
                />
            )}
            selected={selected}
            isDisabled={deleted}
            className='cvat-job-page-list-item'
            style={{ height }}
            onClick={handleCardClick}
            onOpenInNewTab={() => window.open(jobURL, '_blank', 'noopener,noreferrer')}
            onContextMenuCapture={handleContextMenuCapture}
        />
    );

    return (
        <JobActionsComponent
            jobInstance={job}
            dropdownTrigger={['contextMenu']}
            triggerElement={card}
            onApplyFilter={onApplyFilter}
        />
    );
}

export default React.memo(JobCardComponent);
