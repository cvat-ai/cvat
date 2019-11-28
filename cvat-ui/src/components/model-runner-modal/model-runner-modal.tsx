import React from 'react';

import {
    Row,
    Col,
    Tag,
    Spin,
    Icon,
    Modal,
    Select,
    Tooltip,
    Checkbox,
} from 'antd';

import { Model } from '../../reducers/interfaces';

interface StringObject {
    [index: string]: string;
}

interface Props {
    modelsFetching: boolean;
    modelsInitialized: boolean;
    models: Model[];
    activeProcesses: StringObject;
    visible: boolean;
    taskInstance: any;
    getModels(): void;
    closeDialog(): void;
    runInference(
        taskInstance: any,
        model: Model,
        mapping: StringObject,
        cleanOut: boolean,
    ): void;
}

interface State {
    selectedModel: string | null;
    cleanOut: boolean;
    mapping: StringObject;
    colors: StringObject;
    matching: {
        model: string,
        task: string,
    };
}

const nextColor = (function *() {
    const values = [
        'magenta', 'green', 'geekblue',
        'orange', 'red', 'cyan',
        'blue', 'volcano', 'purple',
    ];

    for (let i = 0; i < values.length; i++) {
        yield values[i];
        if (i === values.length) {
            i = 0;
        }
    }
})();

export default class ModelRunnerModalComponent extends React.PureComponent<Props, State> {
    public constructor(props: Props) {
        super(props);
        this.state = {
            selectedModel: null,
            mapping: {},
            colors: {},
            cleanOut: false,
            matching: {
                model: '',
                task: '',
            },
        };
    }

    private renderModelSelector() {
        return (
            <Row type='flex' align='middle'>
                <Col span={4}>Model:</Col>
                <Col span={19}>
                    <Select
                        placeholder='Select a model'
                        style={{width: '100%'}}
                        onChange={(value: string) => this.setState({
                            selectedModel: value,
                            mapping: {},
                        })
                    }>
                        {this.props.models.map((model) =>
                            <Select.Option key={model.name}>
                                {model.name}
                            </Select.Option>
                        )}
                    </Select>
                </Col>
            </Row>
        );
    }

    private renderMappingTag(modelLabel: string, taskLabel: string) {
        return (
            <Row key={`${modelLabel}-${taskLabel}`} type='flex' justify='start' align='middle'>
                <Col span={10}>
                    <Tag color={this.state.colors[modelLabel]}>{modelLabel}</Tag>
                </Col>
                <Col span={10} offset={1}>
                    <Tag color={this.state.colors[modelLabel]}>{taskLabel}</Tag>
                </Col>
                <Col span={1} offset={1}>
                    <Tooltip overlay='Remove the mapped values'>
                        <Icon
                            className='cvat-run-model-dialog-remove-mapping-icon'
                            type='close-circle'
                            onClick={() => {
                            const mapping = {...this.state.mapping};
                            delete mapping[modelLabel];
                            this.setState({
                                mapping,
                            });
                        }}/>
                    </Tooltip>
                </Col>
            </Row>
        );
    }

    private renderMappingInputSelector(
        value: string,
        current: string,
        options: string[]
    ) {
        return (
            <Select
                value={value}
                placeholder={`${current} labels`}
                style={{width: '100%'}}
                onChange={(value: string) => {
                    const anotherValue = current === 'Model' ?
                        this.state.matching.task : this.state.matching.model;

                    if (!anotherValue) {
                        const matching = { ...this.state.matching };
                        if (current === 'Model') {
                            matching.model = value;
                        } else {
                            matching.task = value;
                        }
                        this.setState({
                            matching,
                        });
                    } else {
                        const colors = {...this.state.colors};
                        const mapping = {...this.state.mapping};

                        if (current === 'Model') {
                            colors[value] = nextColor.next().value;
                            mapping[value] = anotherValue;
                        } else {
                            colors[anotherValue] = nextColor.next().value;
                            mapping[anotherValue] = value;
                        }

                        this.setState({
                            colors,
                            mapping,
                            matching: {
                                task: '',
                                model: '',
                            },
                        })
                    }
                }}
            >
                {options.map((label: string) =>
                    <Select.Option key={label}>
                        {label}
                    </Select.Option>
                )}
            </Select>
        );
    }

    private renderMappingInput(availableModelLabels: string[], availableTaskLabels: string[]) {
        return (
            <Row type='flex' justify='start' align='middle'>
                <Col span={10}>
                    {this.renderMappingInputSelector(
                        this.state.matching.model,
                        'Model',
                        availableModelLabels,
                    )}
                </Col>
                <Col span={10} offset={1}>
                    {this.renderMappingInputSelector(
                        this.state.matching.task,
                        'Task',
                        availableTaskLabels,
                    )}
                </Col>
                <Col span={1} offset={1}>
                    <Tooltip overlay='Specify a label mapping between model labels and task labels'>
                        <Icon className='cvat-run-model-dialog-info-icon' type='question-circle'/>
                    </Tooltip>
                </Col>
            </Row>
        );
    }

    private renderContent() {
        const model = this.state.selectedModel && this.props.models
            .filter((model) => model.name === this.state.selectedModel)[0];

        const excludedLabels: {
            model: string[],
            task: string[],
        } = {
            model: [],
            task: [],
        };

        const withMapping = model && !model.primary;
        const tags = withMapping ? Object.keys(this.state.mapping)
            .map((modelLabel: string) => {
                const taskLabel = this.state.mapping[modelLabel];
                excludedLabels.model.push(modelLabel);
                excludedLabels.task.push(taskLabel);
                return this.renderMappingTag(
                    modelLabel,
                    this.state.mapping[modelLabel],
                );
            }) : [];

        const availableModelLabels = model ? model.labels
            .filter(
                (label: string) => !excludedLabels.model.includes(label),
            ) : [];
        const availableTaskLabels = this.props.taskInstance.labels
            .map(
                (label: any) => label.name,
            ).filter((label: string) => !excludedLabels.task.includes(label))

        const mappingISAvailable = !!availableModelLabels.length
            && !!availableTaskLabels.length;

        return (
            <div className='cvat-run-model-dialog'>
                { this.renderModelSelector() }
                { withMapping && tags}
                { withMapping
                    && mappingISAvailable
                    && this.renderMappingInput(availableModelLabels, availableTaskLabels)
                }
                { withMapping &&
                    <div>
                        <Checkbox
                            checked={this.state.cleanOut}
                            onChange={(e: any) => this.setState({
                                cleanOut: e.target.checked,
                            })}
                        > Clean old annotations </Checkbox>
                    </div>
                }
            </div>
        );
    }

    private renderSpin() {
        return (
            <Spin size='large' style={{margin: '25% 50%'}}/>
        );
    }

    public componentDidUpdate(prevProps: Props, prevState: State) {
        if (!this.props.modelsInitialized && !this.props.modelsFetching) {
            this.props.getModels();
        }

        if (!prevProps.visible && this.props.visible) {
            this.setState({
                selectedModel: null,
                mapping: {},
                matching: {
                    model: '',
                    task: '',
                },
                cleanOut: false,
            });
        }

        if (this.state.selectedModel && prevState.selectedModel !== this.state.selectedModel) {
            const model = this.props.models
                .filter((model) => model.name === this.state.selectedModel)[0];
            if (!model.primary) {
                let taskLabels: string[] = this.props.taskInstance.labels
                    .map((label: any) => label.name);
                const defaultMapping: StringObject = model.labels
                    .reduce((acc: StringObject, label) => {
                        if (taskLabels.includes(label)) {
                            acc[label] = label;
                            taskLabels = taskLabels.filter((_label) => _label !== label)
                        }

                        return acc;
                    }, {});

                this.setState({
                    mapping: defaultMapping,
                });
            }
        }
    }

    public render() {
        const activeModel = this.props.models.filter(
            (model) => model.name === this.state.selectedModel
        )[0];

        let enabledSubmit = !!activeModel
            && activeModel.primary || !!Object.keys(this.state.mapping).length;

        return (
            this.props.visible && <Modal
                closable={false}
                okType='danger'
                okText='Submit'
                onOk={() => {
                    this.props.runInference(
                        this.props.taskInstance,
                        this.props.models
                            .filter((model) => model.name === this.state.selectedModel)[0],
                        this.state.mapping,
                        this.state.cleanOut,
                    );
                    this.props.closeDialog()
                }}
                onCancel={() => this.props.closeDialog()}
                okButtonProps={{disabled: !enabledSubmit}}
                title='Automatic annotation'
                visible={true}
            >
                {!this.props.modelsInitialized && this.renderSpin()}
                {this.props.modelsInitialized && this.renderContent()}
            </Modal>
        );
    }
}