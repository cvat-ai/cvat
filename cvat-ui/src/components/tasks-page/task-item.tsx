import React from 'react';

import Text from 'antd/lib/typography/Text';
import {
    Col,
    Row,
    Button,
    Icon,
    Progress,
    Menu,
    Dropdown,
} from 'antd';

import moment from 'moment';

export interface TaskItemProps {
    task: any;
}

export interface TaskItemState {
    // Should we put it into redux state?
    preview: string;
}

export default class TaskItem extends React.PureComponent<TaskItemProps, TaskItemState> {
    public componentDidMount() {
        this.props.task.frames.preview().then((data: string) => {
            this.setState({preview: data});
        }).catch((error: any) => {
            console.log(error);
        })
    }

    render() {
        // Task info
        const id = this.props.task.id;
        const owner = this.props.task.owner;
        const updated = moment(this.props.task.updatedDate).fromNow();
        const created = moment(this.props.task.createdDate).format('MMMM Do YYYY');

        // Get and truncate a task name
        let name = this.props.task.name;
        name = `${name.substring(0, 70)}${name.length > 70 ? '...' : ''}`;

        // Count number of jobs and performed jobs
        const numOfJobs = this.props.task.jobs.length;
        const numOfCompleted = this.props.task.jobs.filter(
            (job: any) => job.status === 'completed'
        ).length;

        // Progress appearence depends on number of jobs
        const className = numOfCompleted === numOfJobs ? 'cvat-task-completed-progress':
            numOfCompleted ? 'cvat-task-progress-progress' : 'cvat-task-pending-progress';

        const subMenuIcon = () => (<img src='/assets/icon-sub-menu.svg'/>);

        // Menu
        const menu = (
            <Menu className='cvat-task-item-menu'>
                <Menu.Item key='dump'>Dump annotations</Menu.Item>
                <Menu.Item key='upload'>Upload annotations</Menu.Item>
                <Menu.Item key='tracker'>Open bug tracker</Menu.Item>
                <Menu.Item key='auto'>Run auto annotation</Menu.Item>
                <Menu.Item key='tf'>Run TF annotation</Menu.Item>
                <hr/>
                <Menu.Item key='update'>Update</Menu.Item>
                <Menu.Item key='delete'>Delete</Menu.Item>
            </Menu>
          );

        return (
            <Row className='cvat-tasks-list-item' type='flex' justify='center' align='top'>
                <Col span={4}>
                    <div className='cvat-task-preview-wrapper'>
                        {this.state ?
                            <img alt='Preview' className='cvat-task-preview' src={this.state.preview}/>
                        : null}
                    </div>
                </Col>
                <Col span={10}>
                    <Text strong> {id} {name} </Text> <br/>
                    <Text type='secondary'> Created by { owner } on {created} </Text> <br/>
                    <Text type='secondary'> Last updated {updated} </Text>
                </Col>
                <Col span={6}>
                    <Row type='flex' justify='space-between' align='top'>
                        <Col>
                            <svg height="8" width="8" className={className}>
                                <circle cx="4" cy="4" r="4" strokeWidth="0"/>
                            </svg>
                            { numOfCompleted === numOfJobs ?
                                <Text strong className={className}> Completed </Text>
                                : numOfCompleted ?
                                <Text strong className={className}> In Progress </Text>
                                : <Text strong className={className}> Pending </Text>
                            }
                        </Col>
                        <Col>
                            <Text type='secondary'> {numOfCompleted} of {numOfJobs} jobs </Text>
                        </Col>
                    </Row>
                    <Row>
                        <Progress
                                className='cvat-task-progress'
                                percent={numOfCompleted * 100 / numOfJobs}
                                strokeColor='#1890FF'
                                showInfo={false}
                                strokeWidth={5}
                                size='small'
                            />
                    </Row>
                </Col>
                <Col span={4}>
                    <Row type='flex' justify='end'>
                        <Col>
                            <Button type='primary' size='large' ghost> Open </Button>
                        </Col>
                    </Row>
                    <Row type='flex' justify='end'>
                        <Col>
                            <Text style={{color: 'black'}}> Actions </Text>
                            <Dropdown overlay={menu}>
                                <Icon className='cvat-task-item-menu-icon' component={subMenuIcon}/>
                            </Dropdown>
                        </Col>
                    </Row>
                </Col>
            </Row>
        )
    }
}
