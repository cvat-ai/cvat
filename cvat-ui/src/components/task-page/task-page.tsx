// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React from 'react';
import { RouteComponentProps } from 'react-router';
import { withRouter } from 'react-router-dom';

import {
    Col,
    Row,
    Spin,
    Result,
} from 'antd';

import DetailsContainer from 'containers/task-page/details';
import JobListContainer from 'containers/task-page/job-list';
import ModelRunnerModalContainer from 'containers/model-runner-dialog/model-runner-dialog';
import { Task } from 'reducers/interfaces';
import TopBarComponent from './top-bar';

interface TaskPageComponentProps {
    task: Task | null | undefined;
    fetching: boolean;
    deleteActivity: boolean | null;
    installedGit: boolean;
    getTask: () => void;
}

type Props = TaskPageComponentProps & RouteComponentProps<{id: string}>;

class TaskPageComponent extends React.PureComponent<Props> {
    public componentDidUpdate(): void {
        const {
            deleteActivity,
            history,
        } = this.props;

        if (deleteActivity) {
            history.replace('/tasks');
        }
    }

    public render(): JSX.Element {
        const {
            task,
            fetching,
            getTask,
        } = this.props;

        if (task === null) {
            if (!fetching) {
                getTask();
            }

            return (
                <Spin size='large' className='cvat-spinner' />
            );
        }

        if (typeof (task) === 'undefined') {
            return (
                <Result
                    className='cvat-not-found'
                    status='404'
                    title='Sorry, but this task was not found'
                    subTitle='Please, be sure information you tried to get exist and you have access'
                />
            );
        }

        return (
            <>
                <Row type='flex' justify='center' align='top' className='cvat-task-details-wrapper'>
                    <Col md={22} lg={18} xl={16} xxl={14}>
                        <TopBarComponent taskInstance={(task as Task).instance} />
                        <DetailsContainer task={(task as Task)} />
                        <JobListContainer task={(task as Task)} />
                    </Col>
                </Row>
                <ModelRunnerModalContainer />
            </>
        );
    }
}

export default withRouter(TaskPageComponent);
