// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useEffect } from 'react';

import { useDispatch, useSelector } from 'react-redux';
import { PictureOutlined } from '@ant-design/icons';
import Spin from 'antd/lib/spin';
import { getJobPreviewAsync } from 'actions/jobs-actions';
import { getTaskPreviewAsync } from 'actions/tasks-actions';
import { getProjectsPreviewAsync } from 'actions/projects-actions';
import { getCloudStoragePreviewAsync } from 'actions/cloud-storage-actions';
import { CombinedState, CloudStorage } from 'reducers';
import { Job, Task, Project } from 'cvat-core-wrapper';
import MLModel from 'cvat-core/src/ml-model';
import { getModelPreviewAsync } from 'actions/models-actions';

interface Props {
    job?: Job | undefined;
    task?: Task | undefined;
    project?: Project | undefined;
    cloudStorage?: CloudStorage | undefined;
    model?: MLModel | undefined;
    onClick?: (event: React.MouseEvent) => void;
    loadingClassName?: string;
    emptyPreviewClassName?: string;
    previewWrapperClassName?: string;
    previewClassName?: string;
}

export default function Preview(props: Props): JSX.Element {
    const dispatch = useDispatch();

    const {
        job,
        task,
        project,
        cloudStorage,
        model,
        onClick,
        loadingClassName,
        emptyPreviewClassName,
        previewWrapperClassName,
        previewClassName,
    } = props;

    const preview = useSelector((state: CombinedState) => {
        if (job !== undefined) {
            return state.jobs.previews[job.id];
        } if (project !== undefined) {
            return state.projects.previews[project.id];
        } if (task !== undefined) {
            return state.tasks.previews[task.id];
        } if (cloudStorage !== undefined) {
            return state.cloudStorages.previews[cloudStorage.id];
        } if (model !== undefined) {
            return state.models.previews[model.id];
        }
        return '';
    });

    useEffect(() => {
        if (preview === undefined) {
            if (job !== undefined) {
                dispatch(getJobPreviewAsync(job));
            } else if (project !== undefined) {
                dispatch(getProjectsPreviewAsync(project));
            } else if (task !== undefined) {
                dispatch(getTaskPreviewAsync(task));
            } else if (cloudStorage !== undefined) {
                dispatch(getCloudStoragePreviewAsync(cloudStorage));
            } else if (model !== undefined) {
                dispatch(getModelPreviewAsync(model));
            }
        }
    }, [preview]);

    if (!preview || (preview && preview.fetching)) {
        return (
            <div className={loadingClassName || ''} aria-hidden>
                <Spin size='default' />
            </div>
        );
    }

    if (preview.initialized && !preview.preview) {
        return (
            <div className={emptyPreviewClassName || ''} onClick={onClick} aria-hidden>
                <PictureOutlined />
            </div>
        );
    }

    return (
        <div className={previewWrapperClassName || ''} aria-hidden>
            <img
                className={previewClassName || ''}
                src={preview.preview}
                onClick={onClick}
                alt='Preview image'
                aria-hidden
            />
        </div>
    );
}
