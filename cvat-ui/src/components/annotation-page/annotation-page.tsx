import './styles.scss';
import React from 'react';

import { RouteComponentProps } from 'react-router';

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

type RoutePros = RouteComponentProps<{
    tid: string;
    jid: string;
}>;

export default function AnnotationPageComponent(props: Props & RoutePros): JSX.Element {
    const {
        job,
        fetching,
        getJob,
        match: {
            params,
        },
    } = props;

    const jid = +params.jid;

    if (job === null || (job !== undefined && job.id !== jid)) {
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
