// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React from 'react';
import Tabs from 'antd/lib/tabs';
import Text from 'antd/lib/typography/Text';
import modal from 'antd/lib/modal';
import { EditOutlined, BuildOutlined, ExclamationCircleOutlined } from '@ant-design/icons';

import { SerializedLabel, SerializedAttribute } from 'cvat-core-wrapper';
import RawViewer from './raw-viewer';
import ConstructorViewer, { CreatorType } from './constructor-viewer';
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
    onSubmit: (labels: LabelOptColor[]) => void | Promise<unknown>;
    enableSkeletonCreator?: boolean;
    enableFromModelCreator?: boolean;
    showLabelType?: boolean;
}

interface LabelsEditorState {
    constructorMode: ConstructorMode;
    creatorType: CreatorType;
    savedLabels: LabelOptColor[];
    unsavedLabels: LabelOptColor[];
    labelForUpdate: LabelOptColor | null;
    submitting: boolean;
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
            submitting: false,
        };
    }

    public componentDidMount(): void {
        // just need to perform the same code
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

    private handleRawSubmit = (labels: LabelOptColor[]): Promise<void> => {
        const unsavedLabels = [];
        const savedLabels = [];

        for (const label of labels) {
            if (label.id as number >= 0) {
                savedLabels.push(label);
            } else {
                unsavedLabels.push(label);
            }
        }

        return this.handleSubmit(savedLabels, unsavedLabels);
    };

    private handleCreate = (label: LabelOptColor): void => {
        const { unsavedLabels, savedLabels, submitting } = this.state;
        if (submitting) {
            return;
        }

        const newUnsavedLabels = [
            ...unsavedLabels,
            {
                ...label,
                id: idGenerator(),
            },
        ];

        this.setState({ unsavedLabels: newUnsavedLabels });
        this.handleSubmit(savedLabels, newUnsavedLabels).catch(() => {});
    };

    private handleUpdate = (label: LabelOptColor): void => {
        const { savedLabels, unsavedLabels, submitting } = this.state;
        if (submitting) {
            return;
        }

        const filteredSavedLabels = savedLabels.filter((_label: LabelOptColor) => _label.id !== label.id);
        const filteredUnsavedLabels = unsavedLabels.filter((_label: LabelOptColor) => _label.id !== label.id);
        if (label.id as number >= 0) {
            filteredSavedLabels.push(label);
        } else {
            filteredUnsavedLabels.push(label);
        }

        this.handleSubmit(filteredSavedLabels, filteredUnsavedLabels).catch(() => {});
        this.setState({ constructorMode: ConstructorMode.SHOW });
    };

    private handlerCancel = (): void => {
        this.setState({ constructorMode: ConstructorMode.SHOW });
    };

    private handleDelete = (label: LabelOptColor): void => {
        const { submitting } = this.state;
        if (submitting) {
            return;
        }

        const deleteLabel = (): Promise<void> => {
            const { unsavedLabels, savedLabels, submitting: currentlySubmitting } = this.state;
            if (currentlySubmitting) {
                return Promise.resolve();
            }

            const filteredUnsavedLabels = unsavedLabels
                .filter((_label: LabelOptColor): boolean => _label.id !== label.id);
            const filteredSavedLabels = savedLabels
                .filter((_label: LabelOptColor): boolean => _label.id !== label.id);

            this.setState({ savedLabels: filteredSavedLabels, unsavedLabels: filteredUnsavedLabels });
            return this.handleSubmit(filteredSavedLabels, filteredUnsavedLabels);
        };

        if (typeof label.id !== 'undefined' && label.id >= 0) {
            modal.confirm({
                className: 'cvat-modal-delete-label',
                icon: <ExclamationCircleOutlined />,
                title: `Do you want to delete "${label.name}" label?`,
                content: 'This action cannot be undone. All annotations associated to the label will be deleted.',
                type: 'warning',
                okButtonProps: { type: 'primary', danger: true },
                onOk: deleteLabel,
            });
        } else {
            deleteLabel().catch(() => {});
        }
    };

    private async handleSubmit(
        savedLabels: LabelOptColor[],
        unsavedLabels: LabelOptColor[],
    ): Promise<void> {
        function findLabelByID(labels: SerializedLabel[], id?: number): SerializedLabel | null {
            if (typeof id === 'undefined') {
                return null;
            }

            return labels.find((label: SerializedLabel): boolean => label.id === id) ?? null;
        }

        function findDeletedAttributes(label: LabelOptColor, originalLabel: SerializedLabel): SerializedAttribute[] {
            const currentAttributeIDs = new Set(label.attributes
                .map((attr: SerializedAttribute): number | undefined => attr.id)
                .filter((id: number | undefined): id is number => typeof id !== 'undefined' && id >= 0));

            return originalLabel.attributes
                .filter((attr: SerializedAttribute): boolean => (
                    typeof attr.id !== 'undefined' && attr.id >= 0 && !currentAttributeIDs.has(attr.id)
                )).map((attr: SerializedAttribute): SerializedAttribute => ({
                    ...attr,
                    values: [...attr.values],
                    deleted: true,
                }));
        }

        function transformLabel(
            label: LabelOptColor,
            originalLabels: SerializedLabel[],
        ): LabelOptColor {
            const originalLabel = findLabelByID(originalLabels, label.id);
            const transformed: any = {
                name: label.name,
                id: label.id as number < 0 ? undefined : label.id,
                color: label.color,
                type: label.type ?? 'any',
                attributes: label.attributes.map((attr: SerializedAttribute): SerializedAttribute => ({
                    ...attr,
                    id: attr.id as number < 0 ? undefined : attr.id,
                    input_type: attr.input_type.toLowerCase() as SerializedAttribute['input_type'],
                    values: [...attr.values],
                })),
            };

            if (originalLabel) {
                transformed.attributes.push(...findDeletedAttributes(label, originalLabel));
            }

            if (label.type === 'skeleton') {
                transformed.svg = label.svg;
                transformed.sublabels = (label.sublabels || [])
                    .map((internalLabel: LabelOptColor) => {
                        const originalSublabel = originalLabel ?
                            findLabelByID(originalLabel.sublabels || [], internalLabel.id) :
                            null;
                        return transformLabel(
                            internalLabel,
                            originalSublabel ? [originalSublabel] : [],
                        );
                    });
            }

            return transformed;
        }

        const {
            labels,
            onSubmit,
        } = this.props;
        const { submitting } = this.state;
        if (submitting) {
            return;
        }

        const output = savedLabels.concat(unsavedLabels)
            .map((label: LabelOptColor): LabelOptColor => (
                transformLabel(label, labels)
            ));

        this.setState({ submitting: true });
        try {
            await onSubmit(output);
        } finally {
            this.setState({ submitting: false });
        }
    }

    public render(): JSX.Element {
        const {
            labels,
            enableSkeletonCreator = true,
            enableFromModelCreator = true,
            showLabelType = true,
        } = this.props;
        const {
            savedLabels, unsavedLabels, constructorMode, labelForUpdate, creatorType, submitting,
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
                    onCreate={(_creatorType: CreatorType): void => {
                        this.setState({
                            creatorType: _creatorType,
                            constructorMode: ConstructorMode.CREATE,
                        });
                    }}
                    enableSkeletonCreator={enableSkeletonCreator}
                    enableFromModelCreator={enableFromModelCreator}
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
                    showLabelType={showLabelType}
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
                    showLabelType={showLabelType}
                />
            );
        }

        const content = (
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
                    children: (
                        <RawViewer
                            key='raw'
                            labels={savedAndUnsavedLabels}
                            submitting={submitting}
                            onSubmit={this.handleRawSubmit}
                        />
                    ),
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

        return content;
    }
}
