// Copyright (C) 2021-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React, { useEffect } from 'react';

import { useDispatch, useSelector } from 'react-redux';
import { PictureOutlined } from '@ant-design/icons';
import Spin from 'antd/lib/spin';
import { getTaskPreviewAsync } from 'actions/tasks-actions';
import { CombinedState } from 'reducers';

interface Props {
    taskInstance: any;
}

export default function Preview({ taskInstance }: Props): JSX.Element {
    const dispatch = useDispatch();
    const preview = useSelector((state: CombinedState) => state.tasks.previews[taskInstance.id]);

    useEffect(() => {
        if (preview === undefined) {
            dispatch(getTaskPreviewAsync(taskInstance));
        }
    }, [preview]);

    if (!preview || (preview && preview.fetching)) {
        return (
            <div className='cvat-task-item-loading-preview' aria-hidden>
                <Spin size='default' />
            </div>
        );
    }

    if (preview.initialized && !preview.preview) {
        return (
            <div className='cvat-task-item-empty-preview' aria-hidden>
                <PictureOutlined />
            </div>
        );
    }

    return (
        <div className='cvat-task-preview-wrapper' aria-hidden>
            <img
                className='cvat-task-item-preview'
                src={preview.preview}
                alt='Preview image'
                aria-hidden
            />
        </div>

    );
}
