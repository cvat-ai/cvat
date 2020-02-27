// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
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
    notification,
} from 'antd';

import {
    Model,
    StringObject,
} from 'reducers/interfaces';

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
        model: string;
        task: string;
    };
}

function colorGenerator(): () => string {
    const values = [
        'magenta', 'green', 'geekblue',
        'orange', 'red', 'cyan',
        'blue', 'volcano', 'purple',
    ];

    let index = 0;

    return (): string => {
        const color = values[index++];
        if (index >= values.length) {
            index = 0;
        }

        return color;
    };
}

const nextColor = colorGenerator();

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

    public componentDidUpdate(prevProps: Props, prevState: State): void {
        const {
            taskInstance,
            modelsInitialized,
            modelsFetching,
            models,
            visible,
            getModels,
        } = this.props;

        const {
            selectedModel,
        } = this.state;

        if (!modelsInitialized && !modelsFetching) {
            getModels();
        }

        if (!prevProps.visible && visible) {
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

        if (selectedModel && prevState.selectedModel !== selectedModel) {
            const selectedModelInstance = models
                .filter((model) => model.name === selectedModel)[0];

            if (!selectedModelInstance.primary) {
                if (!selectedModelInstance.labels.length) {
                    notification.warning({
                        message: 'The selected model does not include any lables',
                    });
                }

                let taskLabels: string[] = taskInstance.labels
                    .map((label: any): string => label.name);
                const [defaultMapping, defaultColors]: StringObject[] = selectedModelInstance.labels
                    .reduce((acc: StringObject[], label): StringObject[] => {
                        if (taskLabels.includes(label)) {
                            acc[0][label] = label;
                            acc[1][label] = nextColor();
                            taskLabels = taskLabels.filter((_label): boolean => _label !== label);
                        }

                        return acc;
                    }, [{}, {}]);

                this.setState({
                    mapping: defaultMapping,
                    colors: defaultColors,
                });
            }
        }
    }

    private renderModelSelector(): JSX.Element {
        const { models } = this.props;

        return (
            <Row type='flex' align='middle'>
                <Col span={4}>Model:</Col>
                <Col span={19}>
                    <Select
                        placeholder='Select a model'
                        style={{ width: '100%' }}
                        onChange={(value: string): void => this.setState({
                            selectedModel: value,
                            mapping: {},
                        })}
                    >
                        {models.map((model): JSX.Element => (
                            <Select.Option key={model.name}>
                                {model.name}
                            </Select.Option>
                        ))}
                    </Select>
                </Col>
            </Row>
        );
    }

    private renderMappingTag(modelLabel: string, taskLabel: string): JSX.Element {
        const {
            colors,
            mapping,
        } = this.state;

        return (
            <Row key={`${modelLabel}-${taskLabel}`} type='flex' justify='start' align='middle'>
                <Col span={10}>
                    <Tag color={colors[modelLabel]}>{modelLabel}</Tag>
                </Col>
                <Col span={10} offset={1}>
                    <Tag color={colors[modelLabel]}>{taskLabel}</Tag>
                </Col>
                <Col span={1} offset={1}>
                    <Tooltip title='Remove the mapped values'>
                        <Icon
                            className='cvat-run-model-dialog-remove-mapping-icon'
                            type='close-circle'
                            onClick={(): void => {
                                const newMapping = { ...mapping };
                                delete newMapping[modelLabel];
                                this.setState({
                                    mapping: newMapping,
                                });
                            }}
                        />
                    </Tooltip>
                </Col>
            </Row>
        );
    }

    private renderMappingInputSelector(
        value: string,
        current: string,
        options: string[],
    ): JSX.Element {
        const {
            matching,
            mapping,
            colors,
        } = this.state;

        return (
            <Select
                value={value}
                placeholder={`${current} labels`}
                style={{ width: '100%' }}
                onChange={(selectedValue: string): void => {
                    const anotherValue = current === 'Model'
                        ? matching.task : matching.model;

                    if (!anotherValue) {
                        const newMatching = { ...matching };
                        if (current === 'Model') {
                            newMatching.model = selectedValue;
                        } else {
                            newMatching.task = selectedValue;
                        }
                        this.setState({
                            matching: newMatching,
                        });
                    } else {
                        const newColors = { ...colors };
                        const newMapping = { ...mapping };

                        if (current === 'Model') {
                            newColors[selectedValue] = nextColor();
                            newMapping[selectedValue] = anotherValue;
                        } else {
                            newColors[anotherValue] = nextColor();
                            newMapping[anotherValue] = selectedValue;
                        }

                        this.setState({
                            colors: newColors,
                            mapping: newMapping,
                            matching: {
                                task: '',
                                model: '',
                            },
                        });
                    }
                }}
            >
                {options.map((label: string): JSX.Element => (
                    <Select.Option key={label}>
                        {label}
                    </Select.Option>
                ))}
            </Select>
        );
    }

    private renderMappingInput(
        availableModelLabels: string[],
        availableTaskLabels: string[],
    ): JSX.Element {
        const { matching } = this.state;
        return (
            <Row type='flex' justify='start' align='middle'>
                <Col span={10}>
                    {this.renderMappingInputSelector(
                        matching.model,
                        'Model',
                        availableModelLabels,
                    )}
                </Col>
                <Col span={10} offset={1}>
                    {this.renderMappingInputSelector(
                        matching.task,
                        'Task',
                        availableTaskLabels,
                    )}
                </Col>
                <Col span={1} offset={1}>
                    <Tooltip title='Specify a label mapping between model labels and task labels'>
                        <Icon className='cvat-info-circle-icon' type='question-circle' />
                    </Tooltip>
                </Col>
            </Row>
        );
    }

    private renderContent(): JSX.Element {
        const {
            selectedModel,
            cleanOut,
            mapping,
        } = this.state;
        const {
            models,
            taskInstance,
        } = this.props;

        const model = selectedModel && models
            .filter((_model): boolean => _model.name === selectedModel)[0];

        const excludedModelLabels: string[] = Object.keys(mapping);
        const withMapping = model && !model.primary;
        const tags = withMapping ? excludedModelLabels
            .map((modelLabel: string) => this.renderMappingTag(
                modelLabel,
                mapping[modelLabel],
            )) : [];

        const availableModelLabels = model ? model.labels
            .filter(
                (label: string) => !excludedModelLabels.includes(label),
            ) : [];
        const taskLabels = taskInstance.labels.map(
            (label: any) => label.name,
        );

        const mappingISAvailable = !!availableModelLabels.length
            && !!taskLabels.length;

        return (
            <div className='cvat-run-model-dialog'>
                { this.renderModelSelector() }
                { withMapping && tags}
                { withMapping
                    && mappingISAvailable
                    && this.renderMappingInput(availableModelLabels, taskLabels)}
                { withMapping
                    && (
                        <div>
                            <Checkbox
                                checked={cleanOut}
                                onChange={(e: any): void => this.setState({
                                    cleanOut: e.target.checked,
                                })}
                            >
                                Clean old annotations
                            </Checkbox>
                        </div>
                    )}
            </div>
        );
    }

    public render(): JSX.Element | false {
        const {
            selectedModel,
            mapping,
            cleanOut,
        } = this.state;

        const {
            models,
            visible,
            taskInstance,
            modelsInitialized,
            runInference,
            closeDialog,
        } = this.props;

        const activeModel = models.filter(
            (model): boolean => model.name === selectedModel,
        )[0];

        const enabledSubmit = (!!activeModel
            && activeModel.primary) || !!Object.keys(mapping).length;

        return (
            visible && (
                <Modal
                    closable={false}
                    okType='primary'
                    okText='Submit'
                    onOk={(): void => {
                        runInference(
                            taskInstance,
                            models
                                .filter((model): boolean => model.name === selectedModel)[0],
                            mapping,
                            cleanOut,
                        );
                        closeDialog();
                    }}
                    onCancel={(): void => closeDialog()}
                    okButtonProps={{ disabled: !enabledSubmit }}
                    title='Automatic annotation'
                    visible
                >
                    {!modelsInitialized
                        && <Spin size='large' className='cvat-spinner' />}
                    {modelsInitialized && this.renderContent()}
                </Modal>
            )
        );
    }
}
