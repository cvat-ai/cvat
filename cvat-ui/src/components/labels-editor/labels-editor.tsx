// Copyright (C) 2020-2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React from 'react';
import Tabs from 'antd/lib/tabs';
import Button from 'antd/lib/button';
import Text from 'antd/lib/typography/Text';
import ModalConfirm from 'antd/lib/modal/confirm';
import copy from 'copy-to-clipboard';
import {
    CopyOutlined, EditOutlined, BuildOutlined, ExclamationCircleOutlined,
} from '@ant-design/icons';

import CVATTooltip from 'components/common/cvat-tooltip';
import RawViewer from './raw-viewer';
import ConstructorViewer from './constructor-viewer';
import ConstructorCreator from './constructor-creator';
import ConstructorUpdater from './constructor-updater';

import { idGenerator, Label, Attribute } from './common';

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

export default class LabelsEditor extends React.PureComponent<LabelsEditortProps, LabelsEditorState> {
    public constructor(props: LabelsEditortProps) {
        super(props);

        this.state = {
            savedLabels: [],
            unsavedLabels: [],
            constructorMode: ConstructorMode.SHOW,
            labelForUpdate: null,
        };
    }

    public componentDidMount(): void {
        // just need performe the same code
        this.componentDidUpdate((null as any) as LabelsEditortProps);
    }

    public componentDidUpdate(prevProps: LabelsEditortProps): void {
        function transformLabel(label: any): Label {
            return {
                name: label.name,
                id: label.id || idGenerator(),
                color: label.color,
                attributes: label.attributes.map(
                    (attr: any): Attribute => ({
                        id: attr.id || idGenerator(),
                        name: attr.name,
                        input_type: attr.input_type,
                        mutable: attr.mutable,
                        values: [...attr.values],
                    }),
                ),
            };
        }

        const { labels } = this.props;

        if (!prevProps || prevProps.labels !== labels) {
            const transformedLabels = labels.map(transformLabel);
            this.setState({
                savedLabels: transformedLabels.filter((label: Label) => label.id >= 0),
                unsavedLabels: transformedLabels.filter((label: Label) => label.id < 0),
            });
        }
    }

    private handleRawSubmit = (labels: Label[]): void => {
        const unsavedLabels = [];
        const savedLabels = [];

        for (const label of labels) {
            if (label.id >= 0) {
                savedLabels.push(label);
            } else {
                unsavedLabels.push(label);
            }
        }

        this.setState({ unsavedLabels, savedLabels });
        this.handleSubmit(savedLabels, unsavedLabels);
    };

    private handleCreate = (label: Label | null): void => {
        if (label === null) {
            this.setState({ constructorMode: ConstructorMode.SHOW });
        } else {
            const { unsavedLabels, savedLabels } = this.state;
            const newUnsavedLabels = [
                ...unsavedLabels,
                {
                    ...label,
                    id: idGenerator(),
                },
            ];

            this.setState({ unsavedLabels: newUnsavedLabels });
            this.handleSubmit(savedLabels, newUnsavedLabels);
        }
    };

    private handleUpdate = (label: Label | null): void => {
        const { savedLabels, unsavedLabels } = this.state;

        if (label) {
            const filteredSavedLabels = savedLabels.filter((_label: Label) => _label.id !== label.id);
            const filteredUnsavedLabels = unsavedLabels.filter((_label: Label) => _label.id !== label.id);
            if (label.id >= 0) {
                filteredSavedLabels.push(label);
                this.setState({
                    savedLabels: filteredSavedLabels,
                    constructorMode: ConstructorMode.SHOW,
                });
            } else {
                filteredUnsavedLabels.push(label);
                this.setState({
                    unsavedLabels: filteredUnsavedLabels,
                    constructorMode: ConstructorMode.SHOW,
                });
            }

            this.handleSubmit(filteredSavedLabels, filteredUnsavedLabels);
        } else {
            this.setState({ constructorMode: ConstructorMode.SHOW });
        }
    };

    private handleDelete = (label: Label): void => {
        const deleteLabel = (): void => {
            const { unsavedLabels, savedLabels } = this.state;

            const filteredUnsavedLabels = unsavedLabels.filter((_label: Label): boolean => _label.id !== label.id);
            const filteredSavedLabels = savedLabels.filter((_label: Label): boolean => _label.id !== label.id);

            this.setState({ savedLabels: filteredSavedLabels, unsavedLabels: filteredUnsavedLabels });
            this.handleSubmit(filteredSavedLabels, filteredUnsavedLabels);
        };

        if (typeof label.id !== 'undefined' && label.id >= 0) {
            ModalConfirm({
                title: `Do you want to delete "${label.name}" label?`,
                icon: <ExclamationCircleOutlined />,
                content: 'This action is irreversible. Annotation corresponding with this label will be deleted.',
                type: 'warning',
                okType: 'danger',
                onOk() {
                    deleteLabel();
                },
            });
        } else {
            deleteLabel();
        }
    };

    private handleSubmit(savedLabels: Label[], unsavedLabels: Label[]): void {
        function transformLabel(label: Label): any {
            return {
                name: label.name,
                id: label.id < 0 ? undefined : label.id,
                color: label.color,
                attributes: label.attributes.map((attr: Attribute): any => ({
                    name: attr.name,
                    id: attr.id < 0 ? undefined : attr.id,
                    input_type: attr.input_type.toLowerCase(),
                    default_value: attr.values[0],
                    mutable: attr.mutable,
                    values: [...attr.values],
                })),
            };
        }

        const { onSubmit } = this.props;
        const output = savedLabels.concat(unsavedLabels).map((label: Label): any => transformLabel(label));

        onSubmit(output);
    }

    public render(): JSX.Element {
        const { labels } = this.props;
        const {
            savedLabels, unsavedLabels, constructorMode, labelForUpdate,
        } = this.state;

        return (
            <Tabs
                defaultActiveKey='2'
                type='card'
                tabBarStyle={{ marginBottom: '0px' }}
                tabBarExtraContent={(
                    <CVATTooltip title='Copied to clipboard!' trigger='click'>
                        <Button
                            type='link'
                            icon={<CopyOutlined />}
                            onClick={(): void => {
                                copy(
                                    JSON.stringify(
                                        savedLabels.concat(unsavedLabels).map((label): any => ({
                                            ...label,
                                            id: undefined,
                                            attributes: label.attributes.map((attribute): any => ({
                                                ...attribute,
                                                id: undefined,
                                            })),
                                        })),
                                        null,
                                        4,
                                    ),
                                );
                            }}
                        >
                            Copy
                        </Button>
                    </CVATTooltip>
                )}
            >
                <Tabs.TabPane
                    tab={(
                        <span>
                            <EditOutlined />
                            <Text>Raw</Text>
                        </span>
                    )}
                    key='1'
                >
                    <RawViewer labels={[...savedLabels, ...unsavedLabels]} onSubmit={this.handleRawSubmit} />
                </Tabs.TabPane>

                <Tabs.TabPane
                    tab={(
                        <span>
                            <BuildOutlined />
                            <Text>Constructor</Text>
                        </span>
                    )}
                    key='2'
                >
                    {constructorMode === ConstructorMode.SHOW && (
                        <ConstructorViewer
                            labels={[...savedLabels, ...unsavedLabels]}
                            onUpdate={(label: Label): void => {
                                this.setState({
                                    constructorMode: ConstructorMode.UPDATE,
                                    labelForUpdate: label,
                                });
                            }}
                            onDelete={this.handleDelete}
                            onCreate={(): void => {
                                this.setState({
                                    constructorMode: ConstructorMode.CREATE,
                                });
                            }}
                        />
                    )}
                    {constructorMode === ConstructorMode.UPDATE && labelForUpdate !== null && (
                        <ConstructorUpdater label={labelForUpdate} onUpdate={this.handleUpdate} />
                    )}
                    {constructorMode === ConstructorMode.CREATE && (
                        <ConstructorCreator labelNames={labels.map((l) => l.name)} onCreate={this.handleCreate} />
                    )}
                </Tabs.TabPane>
            </Tabs>
        );
    }
}
