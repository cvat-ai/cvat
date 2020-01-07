import './styles.scss';
import React from 'react';

import {
    Layout,
    Spin,
    Result,
} from 'antd';

import AnnotationTopBarComponent from './top-bar/top-bar';
import StandardWorkspaceComponent from './standard-workspace/standard-workspace';

interface Props {
    jobInstance: any | null | undefined;
    fetching: boolean;
    getJob(): void;
}

export default function AnnotationPageComponent(props: Props): JSX.Element {
    const {
        jobInstance,
        fetching,
        getJob,
    } = props;

    if (jobInstance === null) {
        if (!fetching) {
            getJob();
        }

        return <Spin size='large' className='cvat-spinner' />;
    }

    if (typeof (jobInstance) === 'undefined') {
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
            <AnnotationTopBarComponent />
            <StandardWorkspaceComponent />
        </Layout>
    );
}
