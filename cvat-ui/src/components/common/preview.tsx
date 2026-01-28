// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useEffect } from 'react';

import { useDispatch, useSelector } from 'react-redux';
import { PictureOutlined } from '@ant-design/icons';
import { useInView } from 'react-intersection-observer';
import Spin from 'antd/lib/spin';
import { CombinedState, CloudStorage } from 'reducers';
import { Job, Task, Project } from 'cvat-core-wrapper';
import MLModel from 'cvat-core/src/ml-model';
import { previewQueue, getRequestId } from 'utils/preview-queue';

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

export default function Preview(props: Readonly<Props>): JSX.Element {
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

    const [hasFetched, setHasFetched] = React.useState(false);
    const { ref, inView } = useInView({ triggerOnce: true });

    const { preview, entity } = useSelector((state: CombinedState) => {
        if (job !== undefined) {
            return { preview: state.jobs.previews[job.id], entity: job };
        }
        if (project !== undefined) {
            return { preview: state.projects.previews[project.id], entity: project };
        }
        if (task !== undefined) {
            return { preview: state.tasks.previews[task.id], entity: task };
        }
        if (cloudStorage !== undefined) {
            return { preview: state.cloudStorages.previews[cloudStorage.id], entity: cloudStorage };
        }
        if (model !== undefined) {
            return { preview: state.models.previews[model.id], entity: model };
        }
        return { preview: undefined, entity: null };
    });

    useEffect(() => {
        if (inView && !hasFetched && preview === undefined) {
            setHasFetched(true);

            if (!entity) {
                return;
            }

            const requestId = getRequestId(entity);
            if (requestId) {
                // Add request to queue
                previewQueue.addRequest({
                    id: requestId,
                    entity,
                    dispatch,
                });
            }
        }
    }, [entity, inView, hasFetched, preview]);

    useEffect(() => () => {
        if (entity) {
            const requestId = getRequestId(entity);
            previewQueue.removeRequest(requestId);
        }
    }, [entity]);

    if (!preview || preview?.fetching) {
        return (
            <div ref={ref} className={loadingClassName || ''} aria-hidden>
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
