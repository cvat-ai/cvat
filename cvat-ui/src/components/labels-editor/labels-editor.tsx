// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) 2023-2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React from 'react';
import Tabs from 'antd/lib/tabs';
import Text from 'antd/lib/typography/Text';
import ModalConfirm from 'antd/lib/modal/confirm';
import {
    EditOutlined, BuildOutlined, ExclamationCircleOutlined,
} from '@ant-design/icons';

import { SerializedLabel, SerializedAttribute } from 'cvat-core-wrapper';
import RawViewer from './raw-viewer';
import ConstructorViewer from './constructor-viewer';
import ConstructorCreator from './constructor-creator';
import ConstructorUpdater from './constructor-updater';
import { idGenerator, LabelOptColor } from './common';

enum ConstructorMode {
    SHOW = 'SHOW',
    CREATE = 'CREATE',
    UPDATE = 'UPDATE',
}

interface LabelsEditorProps {
    labels: SerializedLabel[];
    onSubmit: (labels: LabelOptColor[]) => void;
}

interface LabelsEditorState {
    constructorMode: ConstructorMode;
    creatorType: 'basic' | 'skeleton' | 'model';
    savedLabels: LabelOptColor[];
    unsavedLabels: LabelOptColor[];
    labelForUpdate: LabelOptColor | null;
}

export default class LabelsEditor extends React.PureComponent<LabelsEditorProps, LabelsEditorState> {
    public constructor(props: LabelsEditorProps) {
        super(props);

        this.state = {
            savedLabels: [],
            unsavedLabels: [],
            constructorMode: ConstructorMode.SHOW,
            creatorType: 'basic',
            labelForUpdate: null,
        };
    }

    public componentDidMount(): void {
        // just need performe the same code
        this.componentDidUpdate((null as any) as LabelsEditorProps);
    }

    public componentDidUpdate(prevProps: LabelsEditorProps): void {
        function transformLabel(label: SerializedLabel): LabelOptColor {
            return {
                name: label.name,
                id: label.id || idGenerator(),
                color: label.color,
                type: label.type,
                sublabels: label.sublabels,
                svg: label.svg,
                attributes: label.attributes.map(
                    (attr: SerializedAttribute): SerializedAttribute => ({
                        id: attr.id || idGenerator(),
                        name: attr.name,
                        input_type: attr.input_type,
                        mutable: attr.mutable,
                        values: [...attr.values],
                        default_value: attr.default_value,
                    }),
                ),
            };
        }

        const { labels } = this.props;

        if (!prevProps || prevProps.labels !== labels) {
            const transformedLabels = labels.map(transformLabel);
            this.setState({
                savedLabels: transformedLabels.filter((label: LabelOptColor) => (label.id as number) >= 0),
                unsavedLabels: transformedLabels.filter((label: LabelOptColor) => (label.id as number) < 0),
            });
        }
    }

    private handleRawSubmit = (labels: LabelOptColor[]): void => {
        const unsavedLabels = [];
        const savedLabels = [];

        for (const label of labels) {
            if (label.id as number >= 0) {
                savedLabels.push(label);
            } else {
                unsavedLabels.push(label);
            }
        }

        this.setState({ unsavedLabels, savedLabels });
        this.handleSubmit(savedLabels, unsavedLabels);
    };

    private handleCreate = (label: LabelOptColor): void => {
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
    };

    private handleUpdate = (label: LabelOptColor): void => {
        const { savedLabels, unsavedLabels } = this.state;

        const filteredSavedLabels = savedLabels.filter((_label: LabelOptColor) => _label.id !== label.id);
        const filteredUnsavedLabels = unsavedLabels.filter((_label: LabelOptColor) => _label.id !== label.id);
        if (label.id as number >= 0) {
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
        this.setState({ constructorMode: ConstructorMode.SHOW });
    };

    private handlerCancel = (): void => {
        this.setState({ constructorMode: ConstructorMode.SHOW });
    };

    private handleDelete = (label: LabelOptColor): void => {
        const deleteLabel = (): void => {
            const { unsavedLabels, savedLabels } = this.state;

            const filteredUnsavedLabels = unsavedLabels
                .filter((_label: LabelOptColor): boolean => _label.id !== label.id);
            const filteredSavedLabels = savedLabels
                .filter((_label: LabelOptColor): boolean => _label.id !== label.id);

            this.setState({ savedLabels: filteredSavedLabels, unsavedLabels: filteredUnsavedLabels });
            this.handleSubmit(filteredSavedLabels, filteredUnsavedLabels);
        };

        if (typeof label.id !== 'undefined' && label.id >= 0) {
            ModalConfirm({
                className: 'cvat-modal-delete-label',
                icon: <ExclamationCircleOutlined />,
                title: `Do you want to delete "${label.name}" label?`,
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

    private handleSubmit(savedLabels: LabelOptColor[], unsavedLabels: LabelOptColor[]): void {
        function transformLabel(label: LabelOptColor): LabelOptColor {
            const transformed: any = {
                name: label.name,
                id: label.id as number < 0 ? undefined : label.id,
                color: label.color,
                type: label.type || 'any',
                attributes: label.attributes.map((attr: SerializedAttribute): SerializedAttribute => ({
                    name: attr.name,
                    id: attr.id as number < 0 ? undefined : attr.id,
                    input_type: attr.input_type.toLowerCase() as SerializedAttribute['input_type'],
                    default_value: attr.default_value,
                    mutable: attr.mutable,
                    values: [...attr.values],
                })),
            };

            if (label.type === 'skeleton') {
                transformed.svg = label.svg;
                transformed.sublabels = (label.sublabels || [])
                    .map((internalLabel: LabelOptColor) => transformLabel(internalLabel));
            }

            return transformed;
        }

        const { onSubmit } = this.props;
        const output = savedLabels.concat(unsavedLabels)
            .map((label: LabelOptColor): LabelOptColor => transformLabel(label));

        onSubmit(output);
    }

    public render(): JSX.Element {
        const { labels } = this.props;
        const {
            savedLabels, unsavedLabels, constructorMode, labelForUpdate, creatorType,
        } = this.state;
        const savedAndUnsavedLabels = [...savedLabels, ...unsavedLabels];

        let configuratorContent = null;
        if (constructorMode === ConstructorMode.SHOW) {
            configuratorContent = (
                <ConstructorViewer
                    key='viewer'
                    labels={savedAndUnsavedLabels}
                    onUpdate={(label: LabelOptColor): void => {
                        this.setState({
                            constructorMode: ConstructorMode.UPDATE,
                            labelForUpdate: label,
                        });
                    }}
                    onDelete={this.handleDelete}
                    onCreate={(_creatorType: 'basic' | 'skeleton' | 'model'): void => {
                        this.setState({
                            creatorType: _creatorType,
                            constructorMode: ConstructorMode.CREATE,
                        });
                    }}
                />
            );
        } else if (constructorMode === ConstructorMode.UPDATE && labelForUpdate !== null) {
            configuratorContent = (
                <ConstructorUpdater
                    key='updater'
                    label={labelForUpdate}
                    labelNames={labels.map((l) => l.name)}
                    onUpdate={this.handleUpdate}
                    onCancel={this.handlerCancel}
                />
            );
        } else if (constructorMode === ConstructorMode.CREATE) {
            configuratorContent = (
                <ConstructorCreator
                    key='creator'
                    creatorType={creatorType}
                    labelNames={labels.map((l) => l.name)}
                    onCreate={this.handleCreate}
                    onCancel={this.handlerCancel}
                />
            );
        }

        return (
            <Tabs
                defaultActiveKey='configurator'
                type='card'
                tabBarStyle={{ marginBottom: '0px' }}
                items={[{
                    key: 'raw',
                    label: (
                        <span>
                            <EditOutlined />
                            <Text>Raw</Text>
                        </span>
                    ),
                    children: <RawViewer key='raw' labels={savedAndUnsavedLabels} onSubmit={this.handleRawSubmit} />,
                }, {
                    key: 'configurator',
                    label: (
                        <span>
                            <BuildOutlined />
                            <Text>Constructor</Text>
                        </span>
                    ),
                    children: configuratorContent,
                }]}
            />
        );
    }
}
