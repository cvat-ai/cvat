// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React, { useEffect } from 'react';

import {
    Layout,
    Spin,
    Result,
} from 'antd';

import { Workspace } from 'reducers/interfaces';
import AnnotationTopBarContainer from 'containers/annotation-page/top-bar/top-bar';
import StatisticsModalContainer from 'containers/annotation-page/top-bar/statistics-modal';
import StandardWorkspaceComponent from './standard-workspace/standard-workspace';
import AttributeAnnotationWorkspace from './attribute-annotation-workspace/attribute-annotation-workspace';

interface Props {
    job: any | null | undefined;
    fetching: boolean;
    getJob(): void;
    saveLogs(): void;
    workspace: Workspace;
}

export default function AnnotationPageComponent(props: Props): JSX.Element {
    const {
        job,
        fetching,
        getJob,
        saveLogs,
        workspace,
    } = props;

    useEffect(() => {
        saveLogs();
        return saveLogs;
    }, []);

    if (job === null) {
        if (!fetching) {
            getJob();
        }

        return <Spin size='large' className='cvat-spinner' />;
    }

    if (typeof (job) === 'undefined') {
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
            { workspace === Workspace.STANDARD ? (
                <Layout.Content>
                    <StandardWorkspaceComponent />
                </Layout.Content>
            ) : (
                <Layout.Content>
                    <AttributeAnnotationWorkspace />
                </Layout.Content>
            )}
            <StatisticsModalContainer />
        </Layout>
    );
}
