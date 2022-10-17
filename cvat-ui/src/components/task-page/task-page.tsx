// Copyright (C) 2020-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React from 'react';
import { RouteComponentProps } from 'react-router';
import { withRouter } from 'react-router-dom';
import { Row, Col } from 'antd/lib/grid';
import Spin from 'antd/lib/spin';
import Result from 'antd/lib/result';

import DetailsContainer from 'containers/task-page/details';
import JobListContainer from 'containers/task-page/job-list';
import ModelRunnerModal from 'components/model-runner-modal/model-runner-dialog';
import CVATLoadingSpinner from 'components/common/loading-spinner';
import MoveTaskModal from 'components/move-task-modal/move-task-modal';
import { Task } from 'reducers';
import TopBarComponent from './top-bar';
import {Button} from "antd";
import {DownCircleOutlined} from "@ant-design/icons";
import MetadataTable from "../meta-editor/metadata-menu";

interface TaskPageComponentProps {
    task: Task | null | undefined;
    fetching: boolean;
    updating: boolean;
    jobUpdating: boolean;
    deleteActivity: boolean | null;
    installedGit: boolean;
    getTask: () => void;
}

interface State {
    metaVisible: boolean;
    saveDisabled: boolean;
}

type Props = TaskPageComponentProps & RouteComponentProps<{ id: string }>;

class TaskPageComponent extends React.PureComponent<Props, State> {

    constructor(props: Props) {
        super(props)
        this.state = {
            metaVisible: false,
            saveDisabled: true
        };
    }

    public componentDidMount(): void {
        const { task, fetching, getTask } = this.props;

        if (task === null && !fetching) {
            getTask();
        }
    }

    public componentDidUpdate(prevProps: Props): void {
        const {
            deleteActivity, history, task, fetching, getTask, jobUpdating,
        } = this.props;

        const jobUpdated = prevProps.jobUpdating && !jobUpdating;
        if ((task === null && !fetching) || jobUpdated) {
            getTask();
        }

        if (deleteActivity) {
            history.replace('/tasks');
        }

    }

    private renderMetadata(): JSX.Element | Boolean {
        const { task } = this.props;
        let metadata = task?.instance.metadata
        interface Metadata {
            key: string;
            value: string;
            id: number;
        }
        let dataa: Metadata[] = [];
        dataa = metadata;
        return (
        <table style={{"width": "100%"}}>
            <tbody>
            <tr>
                <th><MetadataTable metadata={dataa} saveDisabled={false} task={task}/></th>
            </tr>

            </tbody>
        </table>
        );
    }

    public render(): JSX.Element {
        const { task, updating, fetching } = this.props;

        if (task === null || (fetching && !updating)) {
            return <Spin size='large' className='cvat-spinner' />;
        }

        if (typeof task === 'undefined') {
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
            <div className='cvat-task-page'>
                { updating ? <CVATLoadingSpinner size='large' /> : null }
                <Row
                    justify='center'
                    align='top'
                    className='cvat-task-details-wrapper'
                >
                    <Col md={22} lg={18} xl={16} xxl={14}>
                        <TopBarComponent taskInstance={(task as Task).instance} />
                        <DetailsContainer task={task as Task} />
                        <Button style={{"width": "100%"}} onClick={()=>{this.setState({metaVisible: !this.state.metaVisible})}}>Metadata<DownCircleOutlined/> </Button>
                        {this.state.metaVisible && this.renderMetadata()}
                        <JobListContainer task={task as Task} />
                    </Col>
                </Row>
                <ModelRunnerModal />
                <MoveTaskModal />
            </div>
        );
    }
}

export default withRouter(TaskPageComponent);
