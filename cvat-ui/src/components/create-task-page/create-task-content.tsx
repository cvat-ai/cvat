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
import FileManager, { Files } from '../file-manager/file-manager';
import FileManagerContainer from '../../containers/file-manager/file-manager';

interface Props {

}

interface State {
    name: string;
    labels: any[];
    files: Files,
}

export default class CreateTaskContent extends React.PureComponent<Props, State> {
    private basicConfigurationComponent: any;
    private advancedConfigurationComponent: any;
    private fileManagerComponent: any;

    public constructor(props: Props) {
        super(props);

        this.state = {
            name: '',
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
        const files = this.fileManagerComponent.getFiles();
        this.setState({
            files,
        });

        return !!(files.local.length + files.share.length + files.remote.length);
    }

    private handleSubmitBasicConfiguration = (values: BaseConfiguration) => {
        this.setState({
            name: values.name,
        });
    };

    private handleSubmitAdvancedConfiguration = (values: AdvancedConfiguration) => {

    };

    private handleSubmitClick = () => {
        this.basicConfigurationComponent.submit()
            .then(this.advancedConfigurationComponent.submit())
            .catch((_: any) => {
                Modal.error({
                    title: 'Could not create a task',
                    content: 'Please, check configuration you specified',
                });
            });

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

    public render() {
        return (
            <Row type='flex' justify='start' align='middle' className='cvat-create-task-content'>
                <Col span={24}>
                    <Text className='cvat-title'> Basic configuration </Text>
                </Col>
                <Col span={24}>
                    <BasicConfigurationForm wrappedComponentRef={
                        (component: any) => { this.basicConfigurationComponent = component }
                    } onSubmit={this.handleSubmitBasicConfiguration}/>
                </Col>
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
                <Col span={24}>
                    <FileManagerContainer/>
                </Col>
                <Col span={24}>
                    <Collapse defaultActiveKey={['1']}>
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
                <Col span={24}>
                    <Button type='danger' onClick={this.handleSubmitClick}> Submit </Button>
                </Col>
            </Row>
        );
    }
}
