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
    private attempts = 0;

    public componentDidUpdate(): void {
        const {
            deleteActivity,
            history,
        } = this.props;

        if (deleteActivity) {
            history.replace('/tasks');
        }

        if (this.attempts === 2) {
            notification.warning({
                message: 'Something wrong with the task. It cannot be fetched from the server',
            });
        }
    }

    public render(): JSX.Element {
        const {
            match,
            task,
            fetching,
            onFetchTask,
        } = this.props;
        const { id } = match.params;
        const fetchTask = !task;

        if (fetchTask) {
            if (!fetching) {
                if (!this.attempts) {
                    this.attempts++;
                    onFetchTask(+id);
                } else {
                    this.attempts++;
                }
            }
            return (
                <Spin size='large' style={{ margin: '25% 50%' }} />
            );
        }

        if (typeof (task) === 'undefined') {
            return (
                <div> </div>
            );
        }

        return (
            <Row type='flex' justify='center' align='top' className='cvat-task-details-wrapper'>
                <Col md={22} lg={18} xl={16} xxl={14}>
                    <TopBarComponent taskInstance={(task as Task).instance} />
                    <DetailsContainer task={(task as Task)} />
                    <JobListContainer task={(task as Task)} />
                </Col>
            </Row>
        );
    }
}

export default withRouter(TaskPageComponent);
