// Copyright (C) 2021-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React, { useEffect } from 'react';

import { useDispatch, useSelector } from 'react-redux';
import Empty from 'antd/lib/empty';
import Spin from 'antd/lib/spin';
import { getProjectsPreviewAsync } from 'actions/projects-actions';
import { CombinedState } from 'reducers';

interface Props {
    project: any;
    onOpenProject: () => void;
}

export default function Preview({ project, onOpenProject }: Props): JSX.Element {
    const dispatch = useDispatch();
    const preview = useSelector((state: CombinedState) => state.projects.previews[project.instance.id]);

    useEffect(() => {
        if (preview === undefined) {
            dispatch(getProjectsPreviewAsync(project.instance));
        }
    }, [preview]);

    if (!preview || (preview && preview.fetching)) {
        return (
            <div className='cvat-project-item-loading-preview' aria-hidden>
                <Spin size='default' />
            </div>
        );
    }

    if (preview.initialized && !preview.preview) {
        return (
            <div className='cvat-projects-project-item-card-preview' onClick={onOpenProject} aria-hidden>
                <Empty description='No tasks' />
            </div>
        );
    }

    return (
        <img
            className='cvat-projects-project-item-card-preview'
            src={preview.preview}
            onClick={onOpenProject}
            alt='Preview image'
            aria-hidden
        />
    );
}
