// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React from 'react';

import {
    Layout,
    Spin,
    Result,
} from 'antd';

import AnnotationTopBarContainer from 'containers/annotation-page/top-bar/top-bar';
import StatisticsModalContainer from 'containers/annotation-page/top-bar/statistics-modal';
import StandardWorkspaceComponent from './standard-workspace/standard-workspace';

interface Props {
    job: any | null | undefined;
    fetching: boolean;
    getJob(): void;
}


export default function AnnotationPageComponent(props: Props): JSX.Element {
    const {
        job,
        fetching,
        getJob,
    } = props;


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
            <AnnotationTopBarContainer />
            <StandardWorkspaceComponent />
            <StatisticsModalContainer />
        </Layout>
    );
}
