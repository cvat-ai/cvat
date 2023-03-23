// Copyright (C) 2022 Intel Corporation
// Copyright (C) 2022 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useHistory } from 'react-router';
import Card from 'antd/lib/card';
import Descriptions from 'antd/lib/descriptions';
import { MoreOutlined } from '@ant-design/icons';
import Dropdown from 'antd/lib/dropdown';
import Menu from 'antd/lib/menu';
// eslint-disable-next-line import/no-extraneous-dependencies
import { MenuInfo } from 'rc-menu/lib/interface';
import { useCardHeightHOC } from 'utils/hooks';
import { exportActions } from 'actions/export-actions';
import Preview from 'components/common/preview';

const useCardHeight = useCardHeightHOC({
    containerClassName: 'cvat-jobs-page',
    siblingClassNames: ['cvat-jobs-page-pagination', 'cvat-jobs-page-top-bar'],
    paddings: 40,
    numberOfRows: 3,
});

interface Props {
    job: any;
}

function JobCardComponent(props: Props): JSX.Element {
    const dispatch = useDispatch();
    const { job } = props;
    const [expanded, setExpanded] = useState<boolean>(false);
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

    return (
        <Card
            onMouseEnter={() => setExpanded(true)}
            onMouseLeave={() => setExpanded(false)}
            style={{ height }}
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
                    <div className='cvat-job-page-list-item-dimension'>{job.dimension.toUpperCase()}</div>
                </>
            )}
        >
            <Descriptions column={1} size='small'>
                <Descriptions.Item label='Stage'>{job.stage}</Descriptions.Item>
                <Descriptions.Item label='State'>{job.state}</Descriptions.Item>
                { expanded ? (
                    <Descriptions.Item label='Size'>{job.stopFrame - job.startFrame + 1}</Descriptions.Item>
                ) : null}
                { expanded && job.assignee ? (
                    <Descriptions.Item label='Assignee'>{job.assignee.username}</Descriptions.Item>
                ) : null}
            </Descriptions>
            <Dropdown overlay={(
                <Menu onClick={(action: MenuInfo) => {
                    if (action.key === 'task') {
                        history.push(`/tasks/${job.taskId}`);
                    } else if (action.key === 'project') {
                        history.push(`/projects/${job.projectId}`);
                    } else if (action.key === 'bug_tracker') {
                        window.open(job.bugTracker, '_blank', 'noopener noreferrer');
                    }
                }}
                >
                    <Menu.Item key='task' disabled={job.taskId === null}>Go to the task</Menu.Item>
                    <Menu.Item key='project' disabled={job.projectId === null}>Go to the project</Menu.Item>
                    <Menu.Item key='bug_tracker' disabled={!job.bugTracker}>Go to the bug tracker</Menu.Item>
                    <Menu.Item key='export_job' onClick={() => dispatch(exportActions.openExportDatasetModal(job))}>Export job</Menu.Item>
                </Menu>
            )}
            >
                <MoreOutlined className='cvat-job-card-more-button' />
            </Dropdown>
        </Card>
    );
}

export default React.memo(JobCardComponent);
