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
    Upload,
} from 'antd';

import { ClickParam } from 'antd/lib/menu/index';

import moment from 'moment';

export interface TaskItemProps {
    task: any;
    preview: string;
    loaders: any[];
    dumpers: any[];
    onDumpAnnotation: (tid: number, format: string) => void;
    onLoadAnnotation: (tid: number, format: string, file: File) => void;
}

function isDefaultFormat(dumperName: string, taskMode: string): boolean {
    return (dumperName === 'CVAT XML 1.1 for videos' && taskMode === 'interpolation')
    || (dumperName === 'CVAT XML 1.1 for images' && taskMode === 'annotation');
}

export default class TaskItem extends React.PureComponent<TaskItemProps> {
    constructor(props: TaskItemProps) {
        super(props);
    }

    private handleMenuClick(params: ClickParam) {
        const tracker = this.props.task.bugTracker;

        if (params.keyPath.length === 2) {
            // dump or upload
            if (params.keyPath[1] === 'dump') {
                this.props.onDumpAnnotation(this.props.task.id, params.keyPath[0]);
            }
        } else {
            switch (params.key) {
                case 'tracker': {
                    window.open(`${tracker}`, '_blank')
                    return;
                } case 'auto': {

                    return;
                } case 'tf': {

                    return;
                } case 'update': {

                    return;
                } case 'delete': {

                    return;
                } default: {
                    return;
                }
            }
        }
    }

    private renderPreview() {
        const preview = this.props.preview;

        return (
            <Col span={4}>
                <div className='cvat-task-preview-wrapper'>
                    <img alt='Preview' className='cvat-task-preview' src={preview}/>
                </div>
            </Col>
        )
    }

    private renderDescription() {
        // Get and truncate a task name
        let name = this.props.task.name;
        name = `${name.substring(0, 70)}${name.length > 70 ? '...' : ''}`;

        const id = this.props.task.id;
        const owner = this.props.task.owner.username;
        const updated = moment(this.props.task.updatedDate).fromNow();
        const created = moment(this.props.task.createdDate).format('MMMM Do YYYY');

        return (
            <Col span={10}>
                <Text strong> {id} {name} </Text> <br/>
                <Text type='secondary'> Created by { owner } on {created} </Text> <br/>
                <Text type='secondary'> Last updated {updated} </Text>
            </Col>
        )
    }

    private renderProgress() {
        // Count number of jobs and performed jobs
        const numOfJobs = this.props.task.jobs.length;
        const numOfCompleted = this.props.task.jobs.filter(
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
                            <Text strong className={progressColor}> Completed </Text>
                            : numOfCompleted ?
                            <Text strong className={progressColor}> In Progress </Text>
                            : <Text strong className={progressColor}> Pending </Text>
                        }
                    </Col>
                    <Col>
                        <Text type='secondary'> {numOfCompleted} of {numOfJobs} jobs </Text>
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

    private renderDumperItem(dumper: any) {
        const mode = this.props.task.mode;

        if (isDefaultFormat(dumper.name, mode)) {
            return (
                <Menu.Item className='cvat-task-item-dump-submenu-item' key={dumper.name}>
                    <Button block={true} type='link' disabled={!!dumper.active}>
                        <Text strong>
                            {dumper.name}
                        </Text>
                    </Button>
                </Menu.Item>
            );
        } else {
            return (
                <Menu.Item className='cvat-task-item-dump-submenu-item' key={dumper.name}>
                    <Button block={true} type='link' disabled={!!dumper.active}>
                        <Text>
                            {dumper.name}
                        </Text>
                    </Button>
                </Menu.Item>
            );
        }
    }

    private renderLoaderItem(loader: any) {
        return (
            <Menu.Item className='cvat-task-item-upload-submenu-item' key={loader.name}>
                <Upload accept={`.${loader.format}`} multiple={false} beforeUpload={(file: File) => {
                    this.props.onLoadAnnotation(this.props.task.id, loader.name, file);
                    return false;
                }}>
                    <Button block={true} type='link' disabled={!!loader.active}>
                        <Text> {loader.name} </Text>
                    </Button>
                </Upload>
            </Menu.Item>
        );
    }

    private renderMenu() {
        const tracker = this.props.task.bugTracker;

        return (
            <Menu subMenuCloseDelay={0.15} className='cvat-task-item-menu' onClick={this.handleMenuClick.bind(this)}>
                <Menu.SubMenu key='dump' title='Dump annotations'>
                    {this.props.dumpers.map((dumper) => this.renderDumperItem(dumper))}
                </Menu.SubMenu>
                <Menu.SubMenu key='upload' title='Upload annotations'>
                    {this.props.loaders.map((loader) => this.renderLoaderItem(loader))}
                </Menu.SubMenu>
                {tracker ? <Menu.Item key='tracker'>Open bug tracker</Menu.Item> : null}
                <Menu.Item key='auto'>Run auto annotation</Menu.Item>
                <Menu.Item key='tf'>Run TF annotation</Menu.Item>
                <hr/>
                <Menu.Item key='update'>Update</Menu.Item>
                <Menu.Item key='delete'>Delete</Menu.Item>
            </Menu>
        );
    }

    private renderNavigation() {
        const subMenuIcon = () => (<img src='/assets/icon-sub-menu.svg'/>);

        return (
            <Col span={4}>
                <Row type='flex' justify='end'>
                    <Col>
                        <Button type='primary' size='large' ghost> Open </Button>
                    </Col>
                </Row>
                <Row type='flex' justify='end'>
                    <Col>
                        <Text style={{color: 'black'}}> Actions </Text>
                        <Dropdown overlay={this.renderMenu()}>
                            <Icon className='cvat-task-item-menu-icon' component={subMenuIcon}/>
                        </Dropdown>
                    </Col>
                </Row>
            </Col>
        )
    }

    public render() {
        return (
            <Row className='cvat-tasks-list-item' type='flex' justify='center' align='top'>
                {this.renderPreview()}
                {this.renderDescription()}
                {this.renderProgress()}
                {this.renderNavigation()}
            </Row>
        )
    }
}
