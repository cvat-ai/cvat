import React from 'react';
import { RouteComponentProps } from 'react-router';
import { withRouter } from 'react-router-dom';

import {
    Col,
    Row,
    Spin,
    notification,
} from 'antd';

import TopBarComponent from './top-bar';
import DetailsContainer from '../../containers/task-page/details';
import JobListContainer from '../../containers/task-page/job-list';
import { Task } from '../../reducers/interfaces';

interface TaskPageComponentProps {
    task: Task | null;
    fetching: boolean;
    deleteActivity: boolean | null;
    installedGit: boolean;
    onFetchTask: (tid: number) => void;
}

type Props = TaskPageComponentProps & RouteComponentProps<{id: string}>;

class TaskPageComponent extends React.PureComponent<Props> {
    private attempts: number = 0;

    public componentDidUpdate() {
        if (this.props.deleteActivity) {
            this.props.history.replace('/tasks');
        }

        if (this.attempts == 2) {
            notification.warning({
                message: 'Something wrong with the task. It cannot be fetched from the server',
            });
        }
    }

    public render() {
        const { id } = this.props.match.params;
        const fetchTask = !this.props.task;

        if (fetchTask) {
            if (!this.props.fetching) {
                if (!this.attempts) {
                    this.attempts ++;
                    this.props.onFetchTask(+id);
                } else {
                    this.attempts ++;
                }
            }
            return (
                <Spin size='large' style={{margin: '25% 50%'}}/>
            );
        } else if (typeof(this.props.task) === 'undefined') {
            return (
                <div> </div>
            )
        } else {
            const task = this.props.task as Task;
            return (
                <Row type='flex' justify='center' align='top' className='cvat-task-details-wrapper'>
                    <Col md={22} lg={18} xl={16} xxl={14}>
                        <TopBarComponent taskInstance={task.instance}/>
                        <DetailsContainer task={task}/>
                        <JobListContainer task={task}/>
                    </Col>
                </Row>
            );
        }
    }
}

export default withRouter(TaskPageComponent);
