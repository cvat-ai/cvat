import React from 'react';

import {
    Row,
    Col,
    Alert,
    Button,
    Collapse,
    notification,
} from 'antd';

import Text from 'antd/lib/typography/Text';

import BasicConfigurationForm, { BaseConfiguration } from './basic-configuration-form';
import AdvancedConfigurationForm, { AdvancedConfiguration } from './advanced-configuration-form';
import LabelsEditor from '../labels-editor/labels-editor';
import FileManagerContainer from '../../containers/file-manager/file-manager';
import { Files } from '../file-manager/file-manager';

export interface CreateTaskData {
    basic: BaseConfiguration;
    advanced: AdvancedConfiguration;
    labels: any[];
    files: Files,
}

interface Props {
    onCreate: (data: CreateTaskData) => void;
    status: string;
    installedGit: boolean;
}

type State = CreateTaskData;

const defaultState = {
    basic: {
        name: '',
    },
    advanced: {
        zOrder: false,
        lfs: false,
    },
    labels: [],
    files: {
        local: [],
        share: [],
        remote: [],
    },
};

export default class CreateTaskContent extends React.PureComponent<Props, State> {
    private basicConfigurationComponent: any;
    private advancedConfigurationComponent: any;
    private fileManagerContainer: any;

    public constructor(props: Props) {
        super(props);
        this.state = { ...defaultState };
    }

    private validateLabels = () => {
        return !!this.state.labels.length;
    }

    private validateFiles = () => {
        const files = this.fileManagerContainer.getFiles();
        this.setState({
            files,
        });
        const totalLen = Object.keys(files).reduce(
            (acc, key) => acc + files[key].length, 0,
        );

        return !!totalLen;
    }

    private handleSubmitBasicConfiguration = (values: BaseConfiguration) => {
        this.setState({
            basic: {...values},
        });
    };

    private handleSubmitAdvancedConfiguration = (values: AdvancedConfiguration) => {
        this.setState({
            advanced: {...values},
        });
    };

    private handleSubmitClick = () => {
        if (!this.validateLabels()) {
            notification.error({
                message: 'Could not create a task',
                description: 'A task must contain at least one label',
            });
            return;
        }

        if (!this.validateFiles()) {
            notification.error({
                message: 'Could not create a task',
                description: 'A task must contain at least one file',
            });
            return;
        }

        this.basicConfigurationComponent.submit()
            .then(() => {
                return this.advancedConfigurationComponent ?
                    this.advancedConfigurationComponent.submit() :
                    new Promise((resolve) => {
                        resolve();
                    })
            })
            .then(() => {
                this.props.onCreate(this.state);
            })
            .catch((_: any) => {
                notification.error({
                    message: 'Could not create a task',
                    description: 'Please, check configuration you specified',
                });
            });
    }

    private renderBasicBlock() {
        return (
            <Col span={24}>
                <BasicConfigurationForm wrappedComponentRef={
                    (component: any) => { this.basicConfigurationComponent = component }
                } onSubmit={this.handleSubmitBasicConfiguration}/>
            </Col>
        );
    }

    private renderLabelsBlock() {
        return (
            <Col span={24}>
                <Text type='danger'>* </Text>
                <Text className='cvat-black-color'>Labels:</Text>
                <LabelsEditor
                    labels={this.state.labels}
                    onSubmit={
                        (labels) => {
                            this.setState({
                                labels,
                            });
                        }
                    }
                />
            </Col>
        );
    }

    private renderFilesBlock() {
        return (
            <Col span={24}>
                <Text type='danger'>* </Text>
                <Text className='cvat-black-color'>Select files:</Text>
                <FileManagerContainer ref={
                    (container: any) =>
                        this.fileManagerContainer = container
                } withRemote={true}/>
            </Col>
        );
    }

    private renderAdvancedBlock() {
        return (
            <Col span={24}>
                <Collapse>
                    <Collapse.Panel
                        header={
                            <Text className='cvat-title'>Advanced configuration</Text>
                        } key='1'>
                        <AdvancedConfigurationForm
                            installedGit={this.props.installedGit}
                            wrappedComponentRef={
                                (component: any) => {
                                    this.advancedConfigurationComponent = component
                                }
                            }
                            onSubmit={this.handleSubmitAdvancedConfiguration}
                        />
                    </Collapse.Panel>
                </Collapse>
            </Col>
        );
    }

    public componentDidUpdate(prevProps: Props) {
        if (this.props.status === 'CREATED' && prevProps.status !== 'CREATED') {
            notification.info({
                message: 'The task has been created',
            });

            this.basicConfigurationComponent.resetFields();
            if (this.advancedConfigurationComponent) {
                this.advancedConfigurationComponent.resetFields();
            }

            this.fileManagerContainer.reset();

            this.setState({
                ...defaultState,
            });
        }
    }

    public render() {
        const loading = !!this.props.status
            && this.props.status !== 'CREATED'
            && this.props.status !== 'FAILED';

        return (
            <Row type='flex' justify='start' align='middle' className='cvat-create-task-content'>
                <Col span={24}>
                    <Text className='cvat-title'>Basic configuration</Text>
                </Col>

                { this.renderBasicBlock() }
                { this.renderLabelsBlock() }
                { this.renderFilesBlock() }
                { this.renderAdvancedBlock() }

                <Col span={18}>
                    {loading ? <Alert message={this.props.status}/> : null}
                </Col>
                <Col span={6}>
                    <Button
                        loading={loading}
                        disabled={loading}
                        type='danger'
                        onClick={this.handleSubmitClick}
                    > Submit </Button>
                </Col>
            </Row>
        );
    }
}
