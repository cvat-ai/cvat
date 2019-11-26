import React from 'react';
import { RouteComponentProps } from 'react-router';
import { withRouter } from 'react-router-dom';

import Text from 'antd/lib/typography/Text';
import {
    Col,
    Row,
    Button,
    Icon,
    Progress,
    Dropdown,
} from 'antd';

import moment from 'moment';

import ActionsMenuContainer from '../../containers/actions-menu/actions-menu';

export interface TaskItemProps {
    taskInstance: any;
    previewImage: string;
    deleted: boolean;
}

class TaskItemComponent extends React.PureComponent<TaskItemProps & RouteComponentProps> {
    constructor(props: TaskItemProps & RouteComponentProps) {
        super(props);
    }

    private renderPreview() {
        return (
            <Col span={4}>
                <div className='cvat-task-item-preview-wrapper'>
                    <img alt='Preview' className='cvat-task-item-preview' src={this.props.previewImage}/>
                </div>
            </Col>
        )
    }

    private renderDescription() {
        // Task info
        const task = this.props.taskInstance;
        const { id } = task;
        const owner = task.owner ? task.owner.username : null;
        const updated = moment(task.updatedDate).fromNow();
        const created = moment(task.createdDate).format('MMMM Do YYYY');

        // Get and truncate a task name
        const name = `${task.name.substring(0, 70)}${task.name.length > 70 ? '...' : ''}`;

        return (
            <Col span={10}>
                <Text strong>{`${id} ${name}`}</Text> <br/>
                { owner ?
                    <>
                        <Text type='secondary'>
                            Created { owner ? 'by ' + owner : '' } on {created}
                        </Text> <br/>
                    </> : null
                }
                <Text type='secondary'>{`Last updated ${updated}`}</Text>
            </Col>
        )
    }

    private renderProgress() {
        const task = this.props.taskInstance;
        // Count number of jobs and performed jobs
        const numOfJobs = task.jobs.length;
        const numOfCompleted = task.jobs.filter(
            (job: any) => job.status === 'completed'
        ).length;

        // Progress appearence depends on number of jobs
        const progressColor = numOfCompleted === numOfJobs ? 'cvat-task-completed-progress':
            numOfCompleted ? 'cvat-task-progress-progress' : 'cvat-task-pending-progress';

        return (
            <Col span={6}>
                <Row type='flex' justify='space-between' align='top'>
                    <Col>
                        <svg height='8' width='8' className={progressColor}>
                            <circle cx='4' cy='4' r='4' strokeWidth='0'/>
                        </svg>
                        { numOfCompleted === numOfJobs ?
                            <Text strong className={progressColor}>{'Completed'}</Text>
                            : numOfCompleted ?
                            <Text strong className={progressColor}>{'In Progress'}</Text>
                            : <Text strong className={progressColor}>{'Pending'}</Text>
                        }
                    </Col>
                    <Col>
                        <Text type='secondary'>{`${numOfCompleted} of ${numOfJobs} jobs`}</Text>
                    </Col>
                </Row>
                <Row>
                    <Progress
                            className={`${progressColor} cvat-task-progress`}
                            percent={numOfCompleted * 100 / numOfJobs}
                            strokeColor='#1890FF'
                            showInfo={false}
                            strokeWidth={5}
                            size='small'
                        />
                </Row>
            </Col>
        )
    }

    private renderNavigation() {
        const subMenuIcon = () => (<img src='/assets/icon-sub-menu.svg'/>);
        const { id } = this.props.taskInstance;

        return (
            <Col span={4}>
                <Row type='flex' justify='end'>
                    <Col>
                        <Button type='primary' size='large' ghost onClick={
                            () => this.props.history.push(`/tasks/${id}`)
                        }> Open </Button>
                    </Col>
                </Row>
                <Row type='flex' justify='end'>
                    <Col>
                        <Text className='cvat-black-color'>Actions</Text>
                        <Dropdown overlay={
                            <ActionsMenuContainer
                                taskInstance={this.props.taskInstance}
                            />
                        }>
                            <Icon className='cvat-task-item-menu-icon' component={subMenuIcon}/>
                        </Dropdown>
                    </Col>
                </Row>
            </Col>
        )
    }

    public render() {
        const style = {};
        if (this.props.deleted) {
            (style as any).pointerEvents = 'none';
            (style as any).opacity = 0.5;
        }

        return (
            <Row className='cvat-tasks-list-item' type='flex' justify='center' align='top' style={{...style}}>
                {this.renderPreview()}
                {this.renderDescription()}
                {this.renderProgress()}
                {this.renderNavigation()}
            </Row>
        )
    };
}

export default withRouter(TaskItemComponent);
