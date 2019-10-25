import React from 'react';

import {
    Tabs,
    Icon,
    Modal,
    Button,
    Tooltip,
} from 'antd';

import Text from 'antd/lib/typography/Text';

import RawViewer from './raw-viewer';
import ConstructorViewer from './constructor-viewer';
import ConstructorCreator from './constructor-creator';
import ConstructorUpdater from './constructor-updater';

enum ConstructorMode {
    SHOW = 'SHOW',
    CREATE = 'CREATE',
    UPDATE = 'UPDATE',
}

interface LabelsEditortProps {
    labels: any;
    onSubmit: (labels: string) => void;
}

interface LabelsEditorState {
    constructorMode: ConstructorMode;
    labelForUpdate: any;
    labels: any;
}

export default class LabelsEditor
    extends React.PureComponent<LabelsEditortProps, LabelsEditorState> {

    public constructor(props: LabelsEditortProps) {
        super(props);
        this.state = {
            constructorMode: ConstructorMode.SHOW,
            labels: this.props.labels,
            labelForUpdate: null,
        };
    }

    private handleUpdate = (label: any) => {
        this.setState({
            constructorMode: ConstructorMode.UPDATE,
            labelForUpdate: label,
        });
    };

    private handleDelete = (label: any) => {
        if (Number.isInteger(label.id)) {
            Modal.error({
                title: 'Could not delete the label',
                content: 'It has been already saved on the server',
            });
        }
    };

    private handleCreate = (label: any) => {
        if (label === null) {
            this.setState({
                constructorMode: ConstructorMode.SHOW,
            });
        } else {
            this.setState({
                labels: [...this.state.labels, label]
            })
        }
    };

    private handleSubmit = () => {

    };

    public render() {
        return (
            <Tabs defaultActiveKey='2' type='card' tabBarStyle={{marginBottom: '0px'}} tabBarExtraContent={
                <Button
                    type='ghost'
                    size='default'
                    onClick={() => this.handleSubmit}
                > Submit Labels </Button>
            }>
                <Tabs.TabPane tab={
                    <span>
                        <Icon type='edit'/>
                        <Text> Raw </Text>
                    </span>
                } key='1'>
                    <RawViewer labels={this.state.labels}/>
                </Tabs.TabPane>

                <Tabs.TabPane tab={
                    <span>
                        <Icon type='build'/>
                        <Text> Constructor </Text>
                        <span className='labels-editor-new-label-button' onClick={
                            () => this.setState({
                                constructorMode: ConstructorMode.CREATE,
                            })
                        }>
                            <Tooltip title='Add label'>
                                <Icon type='plus-circle'/>
                            </Tooltip>
                        </span>
                    </span>
                } key='2'>
                    {
                        this.state.constructorMode === ConstructorMode.SHOW ?
                        <ConstructorViewer
                            labels={this.state.labels}
                            onUpdate={this.handleUpdate}
                            onDelete={this.handleDelete}
                        /> :

                        this.state.constructorMode === ConstructorMode.UPDATE ?
                        <ConstructorUpdater
                            label={this.state.labelForUpdate}
                        /> :

                        <ConstructorCreator
                            onCreate={this.handleCreate}
                        />
                    }
                </Tabs.TabPane>
            </Tabs>
        );
    }
}
