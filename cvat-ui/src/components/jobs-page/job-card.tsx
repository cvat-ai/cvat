// Copyright (C) 2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { useHistory } from 'react-router';
import Card from 'antd/lib/card';
import Empty from 'antd/lib/empty';

import { useCardHeightHOC } from 'utils/hooks';

const useCardHeight = useCardHeightHOC({
    containerClassName: 'cvat-jobs-page',
    siblingClassNames: ['cvat-jobs-page-pagination', 'cvat-jobs-page-top-bar'],
    paddings: 40,
    numberOfRows: 3,
});

interface Props {
    job: any;
    preview: string;
}

function JobCardComponent(props: Props): JSX.Element {
    const { job, preview } = props;
    const history = useHistory();
    const height = useCardHeight();
    const onClick = (): void => {
        history.push(`/tasks/${job.taskId}/jobs/${job.id}`);
    };

    return (
        <Card
            style={{ height }}
            className='cvat-job-page-list-item'
            cover={(
                <>
                    {preview ? (
                        <img
                            className='cvat-jobs-page-job-item-card-preview'
                            src={preview}
                            alt='Preview'
                            onClick={onClick}
                            aria-hidden
                        />
                    ) : (
                        <div className='cvat-jobs-page-job-item-card-preview' onClick={onClick} aria-hidden>
                            <Empty description='Preview not found' />
                        </div>
                    )}
                    <div className='cvat-job-page-list-item-id'>
                        ID:
                        {` ${job.id}`}
                    </div>
                    <div className='cvat-job-page-list-item-dimension'>{job.dimension.toUpperCase()}</div>
                </>
            )}
        >
            <div style={{ width: '100%', height: '33%' }}>Test</div>
        </Card>
    );
}

export default React.memo(JobCardComponent);
