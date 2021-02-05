// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React, { useEffect } from 'react';
import { useHistory } from 'react-router';
import Layout from 'antd/lib/layout';
import Spin from 'antd/lib/spin';
import Result from 'antd/lib/result';

import { Workspace } from 'reducers/interfaces';
import AnnotationTopBarContainer from 'containers/annotation-page/top-bar/top-bar';
import StatisticsModalContainer from 'containers/annotation-page/top-bar/statistics-modal';
import StandardWorkspaceComponent from 'components/annotation-page/standard-workspace/standard-workspace';
import AttributeAnnotationWorkspace from 'components/annotation-page/attribute-annotation-workspace/attribute-annotation-workspace';
import TagAnnotationWorkspace from 'components/annotation-page/tag-annotation-workspace/tag-annotation-workspace';
import ReviewAnnotationsWorkspace from 'components/annotation-page/review-workspace/review-workspace';
import SubmitAnnotationsModal from 'components/annotation-page/request-review-modal';
import SubmitReviewModal from 'components/annotation-page/review/submit-review-modal';
import StandardWorkspace3DComponent from 'components/annotation-page/standard3D-workspace/standard3D-workspace';

interface Props {
    job: any | null | undefined;
    fetching: boolean;
    getJob(): void;
    saveLogs(): void;
    closeJob(): void;
    workspace: Workspace;
}

export default function AnnotationPageComponent(props: Props): JSX.Element {
    const {
        job, fetching, getJob, closeJob, saveLogs, workspace,
    } = props;

    const history = useHistory();
    useEffect(() => {
        saveLogs();
        const root = window.document.getElementById('root');
        if (root) {
            root.style.minHeight = '768px';
        }

        return () => {
            saveLogs();
            if (root) {
                root.style.minHeight = '';
            }

            if (!history.location.pathname.includes('/jobs')) {
                closeJob();
            }
        };
    }, []);

    useEffect(() => {
        if (job === null && !fetching) {
            getJob();
        }
    }, [job, fetching]);

    if (job === null) {
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
            {workspace === Workspace.STANDARD3D && (
                <Layout.Content className='cvat-annotation-layout-content'>
                    <StandardWorkspace3DComponent />
                </Layout.Content>
            )}
            {workspace === Workspace.STANDARD && (
                <Layout.Content className='cvat-annotation-layout-content'>
                    <StandardWorkspaceComponent />
                </Layout.Content>
            )}
            {workspace === Workspace.ATTRIBUTE_ANNOTATION && (
                <Layout.Content className='cvat-annotation-layout-content'>
                    <AttributeAnnotationWorkspace />
                </Layout.Content>
            )}
            {workspace === Workspace.TAG_ANNOTATION && (
                <Layout.Content className='cvat-annotation-layout-content'>
                    <TagAnnotationWorkspace />
                </Layout.Content>
            )}
            {workspace === Workspace.REVIEW_WORKSPACE && (
                <Layout.Content className='cvat-annotation-layout-content'>
                    <ReviewAnnotationsWorkspace />
                </Layout.Content>
            )}
            <StatisticsModalContainer />
            <SubmitAnnotationsModal />
            <SubmitReviewModal />
        </Layout>
    );
}
