import React from 'react';
import { RouteComponentProps } from 'react-router';
import { withRouter } from 'react-router-dom';

import {
    Col,
    Row,
    Spin,
    Modal,
} from 'antd';

import TopBarComponent from './top-bar';
import DetailsContainer from '../../containers/task-page/details';
import JobListContainer from '../../containers/task-page/job-list';
import { Task } from '../../reducers/interfaces';

interface TaskPageComponentProps {
    task: Task;
    taskFetchingError: string;
    taskUpdatingError: string;
    taskDeletingError: string;
    deleteActivity: boolean | null;
    installedGit: boolean;
    onFetchTask: (tid: number) => void;
}

type Props = TaskPageComponentProps & RouteComponentProps<{id: string}>;

class TaskPageComponent extends React.PureComponent<Props> {
    public componentDidUpdate() {
        if (this.props.deleteActivity) {
            this.props.history.replace('/tasks');
        }

        const { id } = this.props.match.params;

        if (this.props.taskFetchingError) {
            Modal.error({
                title: `Could not receive the task ${id}`,
                content: this.props.taskFetchingError,
            });
        }

        if (this.props.taskUpdatingError) {
            Modal.error({
                title: `Could not update the task ${id}`,
                content: this.props.taskUpdatingError,
            });
        }

        if (this.props.taskDeletingError) {
            Modal.error({
                title: `Could not delete the task ${id}`,
                content: this.props.taskDeletingError,
            });
        }
    }

    public render() {
        const { id } = this.props.match.params;
        const fetchTask = !this.props.task && !this.props.taskFetchingError;

        if (fetchTask) {
            this.props.onFetchTask(+id);
            return (
                <Spin size='large' style={{margin: '25% 50%'}}/>
            );
        } else if (this.props.taskFetchingError) {
            return (
                <div> </div>
            )
        } else {
            return (
                <Row type='flex' justify='center' align='top' className='cvat-task-details-wrapper'>
                    <Col md={22} lg={18} xl={16} xxl={14}>
                        <TopBarComponent taskInstance={this.props.task.instance}/>
                        <DetailsContainer task={this.props.task}/>
                        <JobListContainer task={this.props.task}/>
                    </Col>
                </Row>
            );
        }
    }
}

export default withRouter(TaskPageComponent);
