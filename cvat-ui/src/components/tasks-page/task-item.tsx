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

import {
    Task,
    LoadState,
    DumpState,
} from '../../reducers/interfaces';

import moment from 'moment';

export interface TaskItemProps {
    task: Task;
    activeLoading: LoadState | null;
    activeDumpings: DumpState[];
    loaders: any[];
    dumpers: any[];
    onDumpAnnotation: (task: any, dumper: any) => void;
    onLoadAnnotation: (task: any, loader: any, file: File) => void;
}

function isDefaultFormat(dumperName: string, taskMode: string): boolean {
    return (dumperName === 'CVAT XML 1.1 for videos' && taskMode === 'interpolation')
    || (dumperName === 'CVAT XML 1.1 for images' && taskMode === 'annotation');
}

export default class VisibleTaskItem extends React.PureComponent<TaskItemProps> {
    constructor(props: TaskItemProps) {
        super(props);
    }

    private handleMenuClick(params: ClickParam) {
        const tracker = this.props.task.instance.bugTracker;

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
        const preview = this.props.task.preview;

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
        let name = this.props.task.instance.name;
        name = `${name.substring(0, 70)}${name.length > 70 ? '...' : ''}`;

        const id = this.props.task.instance.id;
        const owner = this.props.task.instance.owner.username;
        const updated = moment(this.props.task.instance.updatedDate).fromNow();
        const created = moment(this.props.task.instance.createdDate).format('MMMM Do YYYY');

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
        const numOfJobs = this.props.task.instance.jobs.length;
        const numOfCompleted = this.props.task.instance.jobs.filter(
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
        const mode = this.props.task.instance.mode;
        const dumpWithThisDumper = this.props.activeDumpings
            .filter((dump: DumpState) => dump.dumperName === dumper.name)[0];

        const pending = !!dumpWithThisDumper;

        return (
            <Menu.Item className='cvat-task-item-dump-submenu-item' key={dumper.name}>
                <Button block={true} type='link' disabled={pending}
                    onClick={() => {
                        this.props.onDumpAnnotation(this.props.task.instance, dumper);
                    }}>
                    <Text strong={isDefaultFormat(dumper.name, mode)}>
                        {dumper.name}
                    </Text>
                    {pending ? <Icon type='loading'/> : null}
                </Button>
            </Menu.Item>
        );
    }

    private renderLoaderItem(loader: any) {
        const loadingWithThisLoader = this.props.activeLoading
            && this.props.activeLoading.loaderName === loader.name
            ? this.props.activeLoading : null;

        const pending = !!loadingWithThisLoader;

        return (
            <Menu.Item className='cvat-task-item-load-submenu-item' key={loader.name}>
                <Upload
                    accept={`.${loader.format}`}
                    multiple={false}
                    showUploadList={ false }
                    beforeUpload={(file: RcFile) => {
                        this.props.onLoadAnnotation(
                            this.props.task.instance,
                            loader,
                            file as File,
                        );

                        return false;
                }}>
                    <Button block={true} type='link' disabled={!!this.props.activeLoading}>
                        <Icon type='upload'/>
                        <Text> {loader.name} </Text>
                        {pending ? <Icon type='loading'/> : null}
                    </Button>
                </Upload>
            </Menu.Item>
        );
    }

    private renderMenu() {
        const tracker = this.props.task.instance.bugTracker;

        return (
            <Menu subMenuCloseDelay={0.15} className='cvat-task-item-menu' onClick={this.handleMenuClick.bind(this)}>
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
