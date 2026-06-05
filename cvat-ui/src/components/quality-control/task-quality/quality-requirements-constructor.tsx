// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useMemo, useState } from 'react';
import {
    CopyOutlined, DeleteOutlined, EditOutlined, PlusOutlined, QuestionCircleOutlined,
} from '@ant-design/icons';
import { Config } from '@react-awesome-query-builder/antd';
import Button from 'antd/lib/button';
import Modal from 'antd/lib/modal';
import notification from 'antd/lib/notification';
import Space from 'antd/lib/space';
import Switch from 'antd/lib/switch';
import Text from 'antd/lib/typography/Text';
import CVATTable from 'components/common/cvat-table';
import CVATTooltip from 'components/common/cvat-tooltip';
import {
    getCore,
    QualityRequirement,
    QualitySettings,
} from 'cvat-core-wrapper';
import {
    buildRequirementsById,
    formatAnnotationType,
    formatMetric,
    formatThreshold,
    getRequirementDisplayValue,
    requirementToSaveFields,
} from './quality-requirements-utils';

const core = getCore();

const requirementsFilterConfig: Partial<Config> = {
    fields: {
        name: {
            label: 'Name',
            type: 'text',
            valueSources: ['value'],
        },
        annotationType: {
            label: 'Annotation type',
            type: 'text',
            valueSources: ['value'],
        },
        metric: {
            label: 'Metric',
            type: 'text',
            valueSources: ['value'],
        },
        enabled: {
            label: 'Enabled',
            type: 'boolean',
            valueSources: ['value'],
        },
    },
};

interface RequirementRow {
    key: string;
    requirement: QualityRequirement;
    name: string;
    annotationType: string;
    metric: string;
    threshold: string;
    enabled: boolean;
    searchValue: string;
    children?: RequirementRow[];
}

interface Props {
    settings: QualitySettings;
    disabled: boolean;
    onReload: () => Promise<void>;
    onCreateRequirement: (parentRequirement: QualityRequirement) => void;
    onEditRequirement: (requirement: QualityRequirement) => void;
}

function compareRequirements(first: QualityRequirement, second: QualityRequirement): number {
    if (first.sortOrder !== second.sortOrder) {
        return first.sortOrder - second.sortOrder;
    }

    if (first.name !== second.name) {
        return first.name.localeCompare(second.name);
    }

    return (first.id ?? 0) - (second.id ?? 0);
}

function buildRequirementTree(requirements: QualityRequirement[]): RequirementRow[] {
    const requirementsById = buildRequirementsById(requirements);
    const childrenByParent = new Map<number | null, QualityRequirement[]>();

    for (const requirement of requirements) {
        const parentId = requirement.parentRequirementId;
        const normalizedParentId = parentId !== null && requirementsById.has(parentId) ? parentId : null;
        const siblings = childrenByParent.get(normalizedParentId) ?? [];
        siblings.push(requirement);
        childrenByParent.set(normalizedParentId, siblings);
    }

    for (const siblings of childrenByParent.values()) {
        siblings.sort(compareRequirements);
    }

    const buildRows = (parentId: number | null): RequirementRow[] => (
        (childrenByParent.get(parentId) ?? []).map((requirement: QualityRequirement): RequirementRow => {
            const children = typeof requirement.id === 'number' ? buildRows(requirement.id) : [];
            const annotationType = formatAnnotationType(getRequirementDisplayValue(
                requirement,
                requirementsById,
                (item: QualityRequirement) => item.annotationType,
                (item: QualityRequirement) => item.effective?.annotationType,
            ));
            const metric = formatMetric(getRequirementDisplayValue(
                requirement,
                requirementsById,
                (item: QualityRequirement) => item.metric,
                (item: QualityRequirement) => item.effective?.metric,
            ));
            const threshold = formatThreshold(getRequirementDisplayValue(
                requirement,
                requirementsById,
                (item: QualityRequirement) => item.requiredScore,
                (item: QualityRequirement) => item.effective?.requiredScore,
            ));
            const descendantSearchValue = children.map((child: RequirementRow): string => child.searchValue).join(' ');
            const searchValue = [
                requirement.name,
                annotationType,
                metric,
                threshold,
                descendantSearchValue,
            ].join(' ').toLowerCase();

            return {
                key: String(requirement.id ?? requirement.name),
                requirement,
                name: requirement.name,
                annotationType,
                metric,
                threshold,
                enabled: requirement.enabled,
                searchValue,
                ...(children.length ? { children } : {}),
            };
        })
    );

    return buildRows(null);
}

export default function QualityRequirementsConstructor(props: Readonly<Props>): JSX.Element {
    const {
        settings,
        disabled,
        onReload,
        onCreateRequirement,
        onEditRequirement,
    } = props;

    const [pendingRequirementId, setPendingRequirementId] = useState<number | null>(null);
    const data = useMemo(() => buildRequirementTree(settings.requirements), [settings.requirements]);

    const updateRequirement = async (
        requirement: QualityRequirement,
        action: () => Promise<void>,
        errorMessage: string,
    ): Promise<void> => {
        if (typeof requirement.id !== 'number') {
            return;
        }

        try {
            setPendingRequirementId(requirement.id);
            await action();
            await onReload();
        } catch (error: unknown) {
            notification.error({
                message: errorMessage,
                description: error instanceof Error ? error.message : '',
            });
            throw error;
        } finally {
            setPendingRequirementId(null);
        }
    };

    const onEnabledChange = async (requirement: QualityRequirement, enabled: boolean): Promise<void> => {
        await updateRequirement(
            requirement,
            () => requirement.save({ enabled }).then(() => undefined),
            'Could not update requirement',
        );
    };

    const onCopyRequirement = async (requirement: QualityRequirement): Promise<void> => {
        await updateRequirement(
            requirement,
            async () => {
                await core.analytics.quality.requirements.create({
                    ...requirementToSaveFields(requirement),
                    name: `Copy of ${requirement.name}`,
                    sort_order: requirement.sortOrder + 1,
                });
            },
            'Could not copy requirement',
        );
    };

    const onDeleteRequirement = (requirement: QualityRequirement): void => {
        Modal.confirm({
            title: `Delete "${requirement.name}" requirement?`,
            content: 'This action cannot be undone.',
            okText: 'Delete',
            okButtonProps: { danger: true },
            onOk: async () => {
                await updateRequirement(
                    requirement,
                    () => requirement.delete(),
                    'Could not delete requirement',
                );
            },
        });
    };

    return (
        <CVATTable
            tableTitle='Requirements configuration'
            className='cvat-quality-requirements-configuration-table'
            searchDataIndex={['searchValue']}
            queryBuilder={{
                config: requirementsFilterConfig,
                memoryKey: 'recentlyAppliedQualityRequirementsSettingsFilters',
                memoryCapacity: 10,
            }}
            csvExport={{ filename: `quality-requirements-settings-${settings.id}.csv` }}
            rowClassName={(record: RequirementRow) => (
                record.requirement.isDefault ? 'cvat-quality-requirements-default-row' : ''
            )}
            columns={[{
                title: 'Name',
                dataIndex: 'name',
                sorter: (first: RequirementRow, second: RequirementRow) => first.name.localeCompare(second.name),
                render: (_: string, record: RequirementRow): JSX.Element => (
                    <Text type={record.requirement.isDefault ? 'secondary' : undefined}>
                        {record.name}
                    </Text>
                ),
            }, {
                title: 'Annotation type',
                dataIndex: 'annotationType',
                sorter: (first: RequirementRow, second: RequirementRow) => (
                    first.annotationType.localeCompare(second.annotationType)
                ),
                render: (_: string, record: RequirementRow): JSX.Element => (
                    <Text type={record.requirement.isDefault ? 'secondary' : undefined}>
                        {record.annotationType}
                    </Text>
                ),
            }, {
                title: 'Metric',
                dataIndex: 'metric',
                sorter: (first: RequirementRow, second: RequirementRow) => first.metric.localeCompare(second.metric),
                render: (_: string, record: RequirementRow): JSX.Element => (
                    <Text type={record.requirement.isDefault ? 'secondary' : undefined}>
                        {record.metric}
                    </Text>
                ),
            }, {
                title: 'Threshold',
                dataIndex: 'threshold',
                sorter: (first: RequirementRow, second: RequirementRow) => (
                    first.threshold.localeCompare(second.threshold)
                ),
                render: (_: string, record: RequirementRow): JSX.Element => (
                    <Text type={record.requirement.isDefault ? 'secondary' : undefined}>
                        {record.threshold}
                    </Text>
                ),
            }, {
                title: 'Enabled',
                dataIndex: 'enabled',
                sorter: (first: RequirementRow, second: RequirementRow) => Number(first.enabled) - Number(second.enabled),
                render: (_: boolean, record: RequirementRow): JSX.Element => (
                    <Switch
                        checked={record.requirement.enabled}
                        disabled={disabled || pendingRequirementId !== null}
                        loading={pendingRequirementId === record.requirement.id}
                        onChange={(enabled: boolean) => onEnabledChange(record.requirement, enabled)}
                    />
                ),
            }, {
                title: 'Actions',
                dataIndex: 'actions',
                render: (_: unknown, record: RequirementRow): JSX.Element => {
                    const actionsDisabled = disabled || pendingRequirementId !== null;

                    return (
                        <Space size='small'>
                            <CVATTooltip title='Create child requirement'>
                                <Button
                                    type='text'
                                    className='cvat-quality-requirements-action-button'
                                    size='small'
                                    disabled={actionsDisabled}
                                    icon={<PlusOutlined />}
                                    onClick={() => onCreateRequirement(record.requirement)}
                                />
                            </CVATTooltip>
                            <CVATTooltip title='Edit requirement'>
                                <Button
                                    type='text'
                                    className='cvat-quality-requirements-action-button'
                                    size='small'
                                    disabled={actionsDisabled}
                                    icon={<EditOutlined />}
                                    onClick={() => onEditRequirement(record.requirement)}
                                />
                            </CVATTooltip>
                            <CVATTooltip title='Copy requirement'>
                                <Button
                                    type='text'
                                    className='cvat-quality-requirements-action-button'
                                    size='small'
                                    disabled={actionsDisabled}
                                    icon={<CopyOutlined />}
                                    onClick={() => onCopyRequirement(record.requirement)}
                                />
                            </CVATTooltip>
                            {!record.requirement.isDefault && (
                                <CVATTooltip title='Delete requirement'>
                                    <Button
                                        type='text'
                                        className='cvat-quality-requirements-action-button'
                                        size='small'
                                        disabled={actionsDisabled}
                                        icon={<DeleteOutlined />}
                                        onClick={() => onDeleteRequirement(record.requirement)}
                                    />
                                </CVATTooltip>
                            )}
                        </Space>
                    );
                },
            }]}
            dataSource={data}
            size='small'
            pagination={false}
            locale={{
                emptyText: (
                    <Space>
                        <QuestionCircleOutlined />
                        <Text type='secondary'>No requirements configured</Text>
                    </Space>
                ),
            }}
        />
    );
}
