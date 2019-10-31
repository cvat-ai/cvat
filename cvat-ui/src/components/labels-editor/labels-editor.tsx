import React from 'react';

import {
    Tabs,
    Icon,
    Modal,
} from 'antd';

import Text from 'antd/lib/typography/Text';

import RawViewer from './raw-viewer';
import ConstructorViewer from './constructor-viewer';
import ConstructorCreator from './constructor-creator';
import ConstructorUpdater from './constructor-updater';

import {
    idGenerator,
    Label,
    Attribute,
} from './common';

enum ConstructorMode {
    SHOW = 'SHOW',
    CREATE = 'CREATE',
    UPDATE = 'UPDATE',
}

interface LabelsEditortProps {
    labels: Label[];
    onSubmit: (labels: any[]) => void;
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

        this.state = {
            savedLabels: [],
            unsavedLabels: [],
            constructorMode: ConstructorMode.SHOW,
            labelForUpdate: null,
        };
    }

    private handleSubmit(savedLabels: Label[], unsavedLabels: Label[]) {
        function transformLabel(label: Label): any {
            return {
                name: label.name,
                id: label.id < 0 ? undefined : label.id,
                attributes: label.attributes.map((attr: Attribute): any => {
                    return {
                        name: attr.name,
                        id: attr.id < 0 ? undefined : attr.id,
                        input_type: attr.type.toLowerCase(),
                        default_value: attr.values[0],
                        mutable: attr.mutable,
                        values: [...attr.values],
                    };
                }),
            }
        }

        const output = [];
        for (const label of savedLabels.concat(unsavedLabels)) {
            output.push(transformLabel(label));
        }

        this.props.onSubmit(output);
    }

    private handleRawSubmit = (labels: Label[]) => {
        const unsavedLabels = [];
        const savedLabels = [];

        for (let label of labels) {
            if (label.id >= 0) {
                savedLabels.push(label);
            } else {
                unsavedLabels.push(label);
            }
        }

        this.setState({
            unsavedLabels,
            savedLabels,
        });

        this.handleSubmit(savedLabels, unsavedLabels);
    }

    private handleUpdate = (label: Label | null) => {
        if (label) {
            const savedLabels = this.state.savedLabels
                .filter((_label: Label) => _label.id !== label.id);
            const unsavedLabels = this.state.unsavedLabels
                .filter((_label: Label) => _label.id !== label.id);
            if (label.id >= 0) {
                savedLabels.push(label);
                this.setState({
                    savedLabels,
                    constructorMode: ConstructorMode.SHOW,
                });
            } else {
                unsavedLabels.push(label);
                this.setState({
                    unsavedLabels,
                    constructorMode: ConstructorMode.SHOW,
                });
            }

            this.handleSubmit(savedLabels, unsavedLabels);
        } else {
            this.setState({
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

        this.handleSubmit(this.state.savedLabels, unsavedLabels);
    };

    private handleCreate = (label: Label | null) => {
        if (label === null) {
            this.setState({
                constructorMode: ConstructorMode.SHOW,
            });
        } else {
            const unsavedLabels = [...this.state.unsavedLabels,
                {
                    ...label,
                    id: idGenerator()
                }
            ];

            this.setState({
                unsavedLabels,
            });

            this.handleSubmit(this.state.savedLabels, unsavedLabels);
        }
    };

    public componentDidMount() {
        this.componentDidUpdate(null as any as LabelsEditortProps);
    }

    public componentDidUpdate(prevProps: LabelsEditortProps) {
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
                        values: [...attr.values],
                    };
                }),
            }
        }

        if (!prevProps || prevProps.labels !== this.props.labels) {
            const transformedLabels = this.props.labels.map(transformLabel);
            this.setState({
                savedLabels: transformedLabels
                    .filter((label: Label) => label.id >= 0),
                unsavedLabels: transformedLabels
                    .filter((label: Label) => label.id < 0),
            });
        }
    }

    public render() {
        return (
            <Tabs defaultActiveKey='2' type='card' tabBarStyle={{marginBottom: '0px'}}>
                <Tabs.TabPane tab={
                    <span>
                        <Icon type='edit'/>
                        <Text> Raw </Text>
                    </span>
                } key='1'>
                    <RawViewer
                        labels={[...this.state.savedLabels, ...this.state.unsavedLabels]}
                        onSubmit={this.handleRawSubmit}
                    />
                </Tabs.TabPane>

                <Tabs.TabPane tab={
                    <span>
                        <Icon type='build'/>
                        <Text> Constructor </Text>
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
                            onCreate={() => {
                                this.setState({
                                    constructorMode: ConstructorMode.CREATE,
                                })
                            }}
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
