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
import { UploadChangeParam } from 'antd/lib/upload';
import { RcFile } from 'antd/lib/upload';

import moment from 'moment';

export interface TaskItemProps {
    taskInstance: any;
    previewImage: string;
    dumpActivities: string[] | null;
    loadActivity: string | null;
    loaders: any[];
    dumpers: any[];
    onDumpAnnotation: (task: any, dumper: any) => void;
    onLoadAnnotation: (task: any, loader: any, file: File) => void;
}

function isDefaultFormat(dumperName: string, taskMode: string): boolean {
    return (dumperName === 'CVAT XML 1.1 for videos' && taskMode === 'interpolation')
    || (dumperName === 'CVAT XML 1.1 for images' && taskMode === 'annotation');
}

export default class TaskItemComponent extends React.PureComponent<TaskItemProps> {
    constructor(props: TaskItemProps) {
        super(props);
    }

    private handleMenuClick = (params: ClickParam) => {
        const tracker = this.props.taskInstance.bugTracker;

        if (params.keyPath.length === 2) {
            // dump or upload
            if (params.keyPath[1] === 'dump') {

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
        return (
            <Col span={4}>
                <div className='cvat-task-preview-wrapper'>
                    <img alt='Preview' className='cvat-task-preview' src={this.props.previewImage}/>
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
                <Text strong> {id} {name} </Text> <br/>
                { owner ?
                    <>
                        <Text type='secondary'>
                            Created { owner ? 'by ' + owner : '' } on {created}
                        </Text> <br/>
                    </> : null
                }
                <Text type='secondary'> Last updated {updated} </Text>
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
        const task = this.props.taskInstance;
        const { mode } = task;

        const dumpingWithThisDumper = (this.props.dumpActivities || [])
            .filter((_dumper: string) => _dumper === dumper.name)[0];

        const pending = !!dumpingWithThisDumper;

        return (
            <Menu.Item className='cvat-task-item-dump-submenu-item' key={dumper.name}>
                <Button block={true} type='link' disabled={pending}
                    onClick={() => {
                        this.props.onDumpAnnotation(task, dumper);
                    }}>
                    <Icon type='download'/>
                    <Text strong={isDefaultFormat(dumper.name, mode)}>
                        {dumper.name}
                    </Text>
                    {pending ? <Icon type='loading'/> : null}
                </Button>
            </Menu.Item>
        );
    }

    private renderLoaderItem(loader: any) {
        const loadingWithThisLoader = this.props.loadActivity
            && this.props.loadActivity === loader.name
            ? this.props.loadActivity : null;

        const pending = !!loadingWithThisLoader;

        return (
            <Menu.Item className='cvat-task-item-load-submenu-item' key={loader.name}>
                <Upload
                    accept={`.${loader.format}`}
                    multiple={false}
                    showUploadList={ false }
                    beforeUpload={(file: RcFile) => {
                        this.props.onLoadAnnotation(
                            this.props.taskInstance,
                            loader,
                            file as File,
                        );

                        return false;
                }}>
                    <Button block={true} type='link' disabled={!!this.props.loadActivity}>
                        <Icon type='upload'/>
                        <Text> {loader.name} </Text>
                        {pending ? <Icon type='loading'/> : null}
                    </Button>
                </Upload>
            </Menu.Item>
        );
    }

    private renderMenu() {
        const tracker = this.props.taskInstance.bugTracker;

        return (
            <Menu subMenuCloseDelay={0.15} className='cvat-task-item-menu' onClick={this.handleMenuClick}>
                <Menu.SubMenu key='dump' title='Dump annotations'>
                    {this.props.dumpers.map((dumper) => this.renderDumperItem(dumper))}
                </Menu.SubMenu>
                <Menu.SubMenu key='load' title='Upload annotations'>
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
    };
}
