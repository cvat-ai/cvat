import React from 'react';

import Text from 'antd/lib/typography/Text';
import {
    Col,
    Row,
    Button,
    Icon,
} from 'antd';

import moment from 'moment';

export interface TaskItemProps {
    task: any;
}

export default class TaskItem extends React.PureComponent<TaskItemProps> {
    public componentDidMount() {
        this.props.task.frames.preview().then((data: string) => {
            this.setState({preview: data});
        }).catch((error: any) => {
            console.log(error);
        })
    }

    render() {
        const id = this.props.task.id;
        const owner = this.props.task.owner;
        const updated = moment(this.props.task.updatedDate).fromNow();
        const created = moment(this.props.task.createdDate).format('MMMM Do YYYY');

        let name = this.props.task.name;
        name = `${name.substring(0, 100)}${name.length > 100 ? '...' : ''}`;

        const subMenuIcon = () => (<img src='/assets/icon-sub-menu.svg'/>);

        return (
            <Row className='task-list-item' type='flex' justify='center' align='middle'>
                <Col span={4}>
                    <div className='cvat-task-preview-wrapper'>
                        {this.state ?
                            <img alt='Preview' className='cvat-task-preview' src={this.state.preview}/>
                        : null}
                    </div>
                </Col>
                <Col span={9}>
                    <Row>
                        <Col>
                            <Text strong>
                                {id} {name}
                            </Text>
                        </Col>
                    </Row>
                    <Row>
                        <Col>
                            <Text type='secondary'> Created by { owner } on {created} </Text> <br/>
                            <Text type='secondary'> Last updated {updated} </Text>
                        </Col>
                    </Row>
                </Col>
                <Col span={8}>
                    <Row>
                        <Col>
                            // progress bar
                        </Col>
                    </Row>
                </Col>
                <Col span={3}>
                    <Row>
                        <Col>
                            <Button type="primary" ghost> Open </Button>
                        </Col>
                    </Row>
                    <Row>
                        <Col>
                            <Text style={{color: 'black'}}> Actions </Text>
                            <Icon className='sub-menu-icon' component={subMenuIcon}/>
                        </Col>
                    </Row>
                </Col>
            </Row>
        )
    }
}
