// Copyright (C) 2021-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React, { useEffect } from 'react';

import { useDispatch, useSelector } from 'react-redux';
import { PictureOutlined } from '@ant-design/icons';
import Spin from 'antd/lib/spin';
import { getJobPreviewAsync } from 'actions/jobs-actions';
import { CombinedState, Job } from 'reducers';
import { useHistory } from 'react-router';

interface Props {
    job: Job;
}

export default function Preview({ job }: Props): JSX.Element {
    const dispatch = useDispatch();
    const history = useHistory();
    const preview = useSelector((state: CombinedState) => state.jobs.previews[job.id]);
    const onClick = (event: React.MouseEvent): void => {
        const url = `/tasks/${job.taskId}/jobs/${job.id}`;
        if (event.ctrlKey) {
            // eslint-disable-next-line security/detect-non-literal-fs-filename
            window.open(url, '_blank', 'noopener noreferrer');
        } else {
            history.push(url);
        }
    };

    useEffect(() => {
        if (preview === undefined) {
            dispatch(getJobPreviewAsync(job));
        }
    }, [preview]);

    if (!preview || (preview && preview.fetching)) {
        return (
            <div className='cvat-job-item-loading-preview' aria-hidden>
                <Spin size='default' />
            </div>
        );
    }

    if (preview.initialized && !preview.preview) {
        return (
            <div className='cvat-job-item-empty-preview' aria-hidden>
                <PictureOutlined />
            </div>
        );
    }

    return (
        <img
            className='cvat-jobs-page-job-item-card-preview'
            src={preview.preview}
            onClick={onClick}
            alt='Preview image'
            aria-hidden
        />
    );
}
