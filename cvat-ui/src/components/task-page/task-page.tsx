import React from 'react';
import { RouteComponentProps } from 'react-router';
import { withRouter } from 'react-router-dom';

import {
    Col,
    Row,
    Spin,
} from 'antd';

import TopBarComponent from './top-bar';
import DetailsContainer from '../../containers/task-page/details';
import JobListContainer from '../../containers/task-page/job-list';
import { Task } from '../../reducers/interfaces';

interface TaskPageComponentProps {
    task: Task | undefined | null;
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
    }

    public render() {
        const { id } = this.props.match.params;
        const fetchTask = !this.props.task && !(typeof(this.props.task) === 'undefined');

        if (fetchTask) {
            this.props.onFetchTask(+id);
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
