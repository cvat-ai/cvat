import React from 'react';

import {
    Row,
    Col,
    Modal,
    Button,
    Collapse,
} from 'antd';

import Text from 'antd/lib/typography/Text';

import BasicConfigurationForm, { BaseConfiguration } from './basic-configuration-form';
import AdvancedConfigurationForm, { AdvancedConfiguration } from './advanced-configuration-form';
import LabelsEditor from '../labels-editor/labels-editor';
import FileManagerContainer from '../../containers/file-manager/file-manager';
import { Files } from '../file-manager/file-manager';

interface Props {
    // on create task callback
}

interface State {
    basic: BaseConfiguration;
    advanced: AdvancedConfiguration;
    labels: any[];
    files: Files,
}

export default class CreateTaskContent extends React.PureComponent<Props, State> {
    private basicConfigurationComponent: any;
    private advancedConfigurationComponent: any;
    private fileManagerContainer: any;

    public constructor(props: Props) {
        super(props);

        this.state = {
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
        this.basicConfigurationComponent.submit()
            .catch((_: any) => {
                Modal.error({
                    title: 'Could not create a task',
                    content: 'Please, check basic configuration you specified',
                });
            });

        this.advancedConfigurationComponent ? this.advancedConfigurationComponent.submit()
            .catch((_: any) => {
                Modal.error({
                    title: 'Could not create a task',
                    content: 'Please, check advanced configuration you specified',
                });
            }) : null;

        if (!this.validateLabels()) {
            Modal.error({
                title: 'Could not create a task',
                content: 'A task must contain at least one label',
            });
        }

        if (!this.validateFiles()) {
            Modal.error({
                title: 'Could not create a task',
                content: 'A task must contain at least one file',
            });
        }
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
                <Text type='secondary'> Labels </Text>
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
                <FileManagerContainer ref={
                    (container: any) =>
                        this.fileManagerContainer = container
                }/>
            </Col>
        );
    }

    private renderAdvancedBlock() {
        return (
            <Col span={24}>
                <Collapse>
                    <Collapse.Panel
                        header={
                            <Text className='cvat-title'> Advanced configuration </Text>
                        } key='1'>
                        <AdvancedConfigurationForm wrappedComponentRef={
                            (component: any) => { this.advancedConfigurationComponent = component }
                        } onSubmit={this.handleSubmitAdvancedConfiguration}/>
                    </Collapse.Panel>
                </Collapse>
            </Col>
        );
    }

    public render() {
        return (
            <Row type='flex' justify='start' align='middle' className='cvat-create-task-content'>
                <Col span={24}>
                    <Text className='cvat-title'> Basic configuration </Text>
                </Col>

                { this.renderBasicBlock() }
                { this.renderLabelsBlock() }
                { this.renderFilesBlock() }
                { this.renderAdvancedBlock() }

                <Col span={24}>
                    <Button type='danger' onClick={this.handleSubmitClick}> Submit </Button>
                </Col>
            </Row>
        );
    }
}
