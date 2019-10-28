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

import idGenerator, { Label, Attribute } from './common';

enum ConstructorMode {
    SHOW = 'SHOW',
    CREATE = 'CREATE',
    UPDATE = 'UPDATE',
}

interface LabelsEditortProps {
    labels: Label[];
    onSubmit: (labels: string) => void;
}

interface LabelsEditorState {
    constructorMode: ConstructorMode;
    savedLabels: Label[];
    unsavedLabels: Label[];
    labelForUpdate: Label | null;
}

export default class LabelsEditor
    extends React.PureComponent<LabelsEditortProps, LabelsEditorState> {

    public constructor(props: LabelsEditortProps) {
        super(props);

        function transformLabel(label: any): Label {
            return {
                name: label.name,
                id: label.id || idGenerator(),
                attributes: label.attributes.map((attr: any): Attribute => {
                    return {
                        id: attr.id || idGenerator(),
                        name: attr.name,
                        type: attr.input_type,
                        mutable: attr.mutable,
                        values: attr.values,
                    };
                }),
            }
        }

        this.state = {
            constructorMode: ConstructorMode.SHOW,
            savedLabels: this.props.labels.map(transformLabel)
                .filter((label: Label) => label.id >= 0),
            unsavedLabels: this.props.labels.map(transformLabel)
                .filter((label: Label) => label.id < 0),
            labelForUpdate: null,
        };
    }

    private handleUpdate = (label: Label) => {
        if (label.id >= 0) {
            const savedLabels = this.state.savedLabels
                .filter((_label: Label) => _label.id !== label.id);
            savedLabels.push(label);
            this.setState({
                savedLabels,
                constructorMode: ConstructorMode.SHOW,
            });
        } else {
            const unsavedLabels = this.state.unsavedLabels
                .filter((_label: Label) => _label.id !== label.id);
                unsavedLabels.push(label);
            this.setState({
                unsavedLabels,
                constructorMode: ConstructorMode.SHOW,
            });
        }
    };

    private handleDelete = (label: Label) => {
        // the label is saved on the server, cannot delete it
        if (typeof(label.id) !== 'undefined' && label.id >= 0) {
            Modal.error({
                title: 'Could not delete the label',
                content: 'It has been already saved on the server',
            });
        }

        const unsavedLabels = this.state.unsavedLabels.filter(
            (_label: Label) => _label.id !== label.id
        );

        this.setState({
            unsavedLabels: [...unsavedLabels],
        });
    };

    private handleCreate = (label: Label | null) => {
        if (label === null) {
            this.setState({
                constructorMode: ConstructorMode.SHOW,
            });
        } else {
            this.setState({
                unsavedLabels: [...this.state.unsavedLabels,
                    {
                        ...label,
                        id: idGenerator()
                    }
                ],
            });
        }
    };

    private handleSubmit = () => {
        const forSave = [];
        for (const label of this.state.unsavedLabels.concat(this.state.savedLabels)) {
            let updatedAttributes = false;
            let newLabel = false;
            for (const attr of label.attributes) {
                if (attr.id < 0) {
                    delete attr.id;
                    updatedAttributes = true;
                    break;
                }
            }

            if (label.id < 0) {
                newLabel = true;
                delete label.id;
            }

            if (newLabel || updatedAttributes) {
                forSave.push(label);
            }
        }

        return forSave;
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
                    <RawViewer labels={[...this.state.savedLabels, ...this.state.unsavedLabels]}/>
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
                            labels={[...this.state.savedLabels, ...this.state.unsavedLabels]}
                            onUpdate={(label: Label) => {
                                this.setState({
                                    constructorMode: ConstructorMode.UPDATE,
                                    labelForUpdate: label,
                                });
                            }}
                            onDelete={this.handleDelete}
                        /> :

                        this.state.constructorMode === ConstructorMode.UPDATE
                            && this.state.labelForUpdate !== null ?
                        <ConstructorUpdater
                            label={this.state.labelForUpdate}
                            onUpdate={this.handleUpdate}
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
