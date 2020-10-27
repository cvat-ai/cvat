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
import StandardWorkspaceComponent from './standard-workspace/standard-workspace';
import AttributeAnnotationWorkspace from './attribute-annotation-workspace/attribute-annotation-workspace';
import TagAnnotationWorkspace from './tag-annotation-workspace/tag-annotation-workspace';

interface Props {
    job: any | null | undefined;
    fetching: boolean;
    getJob(): void;
    saveLogs(): void;
    closeJob(): void;
    workspace: Workspace;
}

export default function AnnotationPageComponent(props: Props): JSX.Element {
    const { job, fetching, getJob, closeJob, saveLogs, workspace } = props;

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

    if (job === null) {
        if (!fetching) {
            getJob();
        }

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
            {workspace === Workspace.STANDARD && (
                <Layout.Content style={{ height: '100%' }}>
                    <StandardWorkspaceComponent />
                </Layout.Content>
            )}
            {workspace === Workspace.ATTRIBUTE_ANNOTATION && (
                <Layout.Content style={{ height: '100%' }}>
                    <AttributeAnnotationWorkspace />
                </Layout.Content>
            )}
            {workspace === Workspace.TAG_ANNOTATION && (
                <Layout.Content style={{ height: '100%' }}>
                    <TagAnnotationWorkspace />
                </Layout.Content>
            )}
            <StatisticsModalContainer />
        </Layout>
    );
}
