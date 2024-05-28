// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) 2023-2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useEffect } from 'react';
import Layout from 'antd/lib/layout';
import Result from 'antd/lib/result';
import Spin from 'antd/lib/spin';
import notification from 'antd/lib/notification';
import Button from 'antd/lib/button';

import './styles.scss';
import { Job } from 'cvat-core-wrapper';
import AttributeAnnotationWorkspace from 'components/annotation-page/attribute-annotation-workspace/attribute-annotation-workspace';
import SingleShapeWorkspace from 'components/annotation-page/single-shape-workspace/single-shape-workspace';
import ReviewAnnotationsWorkspace from 'components/annotation-page/review-workspace/review-workspace';
import StandardWorkspaceComponent from 'components/annotation-page/standard-workspace/standard-workspace';
import StandardWorkspace3DComponent from 'components/annotation-page/standard3D-workspace/standard3D-workspace';
import TagAnnotationWorkspace from 'components/annotation-page/tag-annotation-workspace/tag-annotation-workspace';
import FiltersModalComponent from 'components/annotation-page/top-bar/filters-modal';
import StatisticsModalComponent from 'components/annotation-page/top-bar/statistics-modal';
import AnnotationTopBarContainer from 'containers/annotation-page/top-bar/top-bar';
import { Workspace } from 'reducers';
import { usePrevious } from 'utils/hooks';
import EventRecorder from 'utils/event-recorder';
import { readLatestFrame } from 'utils/remember-latest-frame';

interface Props {
    job: Job | null | undefined;
    fetching: boolean;
    annotationsInitialized: boolean;
    frameNumber: number;
    workspace: Workspace;
    getJob(): void;
    saveLogs(): void;
    closeJob(): void;
    changeFrame(frame: number): void;
}

export default function AnnotationPageComponent(props: Props): JSX.Element {
    const {
        job, fetching, annotationsInitialized, workspace, frameNumber, getJob, closeJob, saveLogs, changeFrame,
    } = props;
    const prevJob = usePrevious(job);
    const prevFetching = usePrevious(fetching);

    useEffect(() => {
        saveLogs();
        const root = window.document.getElementById('root');
        if (root) {
            root.style.minHeight = '720px';
        }

        return () => {
            saveLogs();
            closeJob();
            EventRecorder.logger = null;

            if (root) {
                root.style.minHeight = '';
            }
        };
    }, []);

    useEffect(() => {
        if (job === null && !fetching) {
            getJob();
        }
    }, [job, fetching]);

    useEffect(() => {
        if (prevFetching && !fetching && !prevJob && job) {
            const latestFrame = readLatestFrame(job.id);

            if (typeof latestFrame === 'number' &&
                latestFrame !== frameNumber &&
                latestFrame >= job.startFrame &&
                latestFrame <= job.stopFrame
            ) {
                const notificationKey = `cvat-notification-continue-job-${job.id}`;
                notification.info({
                    key: notificationKey,
                    message: `You finished working on frame ${latestFrame}`,
                    description: (
                        <span>
                            Press
                            <Button
                                className='cvat-notification-continue-job-button'
                                type='link'
                                onClick={() => {
                                    changeFrame(latestFrame);
                                    notification.destroy(notificationKey);
                                }}
                            >
                                here
                            </Button>
                            if you would like to continue
                        </span>
                    ),
                    placement: 'topRight',
                    className: 'cvat-notification-continue-job',
                });
            }

            EventRecorder.logger = job.logger;

            if (!job.labels.length) {
                notification.warning({
                    message: 'No labels',
                    description: (
                        <span>
                            {`${job.projectId ? 'Project' : 'Task'} ${
                                job.projectId || job.taskId
                            } does not contain any label. `}
                            <a href={`/${job.projectId ? 'projects' : 'tasks'}/${job.projectId || job.taskId}/`}>
                                Add
                            </a>
                            {' the first one for editing annotation.'}
                        </span>
                    ),
                    placement: 'topRight',
                    className: 'cvat-notification-no-labels',
                });
            }
        }
    }, [job, fetching, prevJob, prevFetching]);

    if (job === null || !annotationsInitialized) {
        return <Spin size='large' className='cvat-spinner' />;
    }

    if (typeof job === 'undefined') {
        return (
            <Result
                className='cvat-not-found'
                status='404'
                title='Sorry, but this job was not found'
                subTitle='Please, be sure information you tried to get exist and you have access'
            />
        );
    }

    return (
        <Layout className='cvat-annotation-page'>
            <Layout.Header className='cvat-annotation-header'>
                <AnnotationTopBarContainer />
            </Layout.Header>
            <Layout.Content className='cvat-annotation-layout-content'>
                {workspace === Workspace.STANDARD3D && <StandardWorkspace3DComponent />}
                {workspace === Workspace.STANDARD && <StandardWorkspaceComponent />}
                {workspace === Workspace.SINGLE_SHAPE && <SingleShapeWorkspace />}
                {workspace === Workspace.ATTRIBUTES && <AttributeAnnotationWorkspace />}
                {workspace === Workspace.TAGS && <TagAnnotationWorkspace />}
                {workspace === Workspace.REVIEW && <ReviewAnnotationsWorkspace />}
            </Layout.Content>
            <FiltersModalComponent />
            <StatisticsModalComponent />
        </Layout>
    );
}
