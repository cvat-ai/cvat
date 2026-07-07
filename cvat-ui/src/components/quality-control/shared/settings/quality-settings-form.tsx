// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useEffect, useState } from 'react';
import { QuestionCircleOutlined } from '@ant-design/icons/lib/icons';
import Text from 'antd/lib/typography/Text';
import InputNumber from 'antd/lib/input-number';
import { Col, Row } from 'antd/lib/grid';
import Divider from 'antd/lib/divider';
import Form, { FormInstance } from 'antd/lib/form';
import CVATTooltip from 'components/common/cvat-tooltip';
import { Label, QualityRequirement, QualitySettings } from 'cvat-core-wrapper';
import { defaultVisibility, ResourceFilterHOC } from 'components/resource-sorting-filtering';
import {
    localStorageRecentKeyword, localStorageRecentCapacity, config,
} from './jobs-filter-configuration';
import QualityRequirementsEditor from '../requirements/quality-requirements-editor';
import QualityRequirementForm from '../requirements/quality-requirement-form';

interface Props {
    form: FormInstance;
    settings: QualitySettings;
    labels: Label[];
    disabled: boolean;
    onSave: () => void;
    onReload: () => Promise<void>;
    onRequirementFormVisibilityChange: (visible: boolean) => void;
}

type RequirementFormMode =
    { type: 'list' } |
    { type: 'create'; parentRequirement: QualityRequirement } |
    { type: 'copy'; sourceRequirement: QualityRequirement; parentRequirement: QualityRequirement } |
    { type: 'edit'; requirement: QualityRequirement };

const FilteringComponentBase = ResourceFilterHOC(
    config, localStorageRecentKeyword, localStorageRecentCapacity,
);
const FilteringComponent = FilteringComponentBase as React.ComponentType<
    Omit<React.ComponentProps<typeof FilteringComponentBase>, 'value' | 'onApplyFilter'>
>;

export default function QualitySettingsForm(props: Readonly<Props>): JSX.Element | null {
    const {
        form,
        settings,
        labels,
        disabled,
        onReload,
        onRequirementFormVisibilityChange,
    } = props;

    const [visibility, setVisibility] = useState(defaultVisibility);
    const [requirementFormMode, setRequirementFormMode] = useState<RequirementFormMode>({ type: 'list' });
    const requirementFormVisible = requirementFormMode.type !== 'list';

    useEffect(() => {
        onRequirementFormVisibilityChange(requirementFormVisible);

        return () => {
            onRequirementFormVisibilityChange(false);
        };
    }, [onRequirementFormVisibilityChange, requirementFormVisible]);

    const initialValues = {
        maxValidationsPerJob: settings.maxValidationsPerJob,
        jobFilter: settings.jobFilter,
    };

    const makeTooltipFragment = (metric: string, description: string): JSX.Element => (
        <div>
            <Text strong>{`${metric}:`}</Text>
            <Text>
                {description}
            </Text>
        </div>
    );

    const makeTooltip = (jsx: JSX.Element): JSX.Element => (
        <div className='cvat-settings-tooltip-inner'>
            {jsx}
        </div>
    );

    const generalTooltip = makeTooltip(
        makeTooltipFragment('Job selection filter', settings.descriptions.jobFilter),
    );

    const jobValidationTooltip = makeTooltip(
        makeTooltipFragment('Max validations per job', settings.descriptions.maxValidationsPerJob),
    );

    if (requirementFormMode.type !== 'list') {
        return (
            <QualityRequirementForm
                settings={settings}
                labels={labels}
                requirement={requirementFormMode.type === 'edit' ? requirementFormMode.requirement : null}
                parentRequirement={
                    requirementFormMode.type === 'create' || requirementFormMode.type === 'copy' ?
                        requirementFormMode.parentRequirement :
                        null
                }
                copiedRequirement={requirementFormMode.type === 'copy' ? requirementFormMode.sourceRequirement : null}
                disabled={disabled}
                onCancel={() => setRequirementFormMode({ type: 'list' })}
                onReload={onReload}
            />
        );
    }

    return (
        <Form
            form={form}
            layout='vertical'
            className={`cvat-quality-settings-form ${disabled ? 'cvat-quality-settings-form-disabled' : ''}`}
            initialValues={initialValues}
            disabled={disabled}
        >
            <Row className='cvat-quality-settings-title'>
                <Text strong>
                    General
                </Text>
                <CVATTooltip title={generalTooltip} className='cvat-settings-tooltip'>
                    <QuestionCircleOutlined
                        className='cvat-quality-settings-tooltip-icon'
                    />
                </CVATTooltip>
            </Row>
            <Row>
                <Col span={12}>
                    <Form.Item
                        name='jobFilter'
                        label='Job selection filter'
                        trigger='onApplyFilter'
                    >
                        {/* value and onApplyFilter will be automatically provided by Form.Item */}
                        <FilteringComponent
                            predefinedVisible={visibility.predefined}
                            builderVisible={visibility.builder}
                            recentVisible={visibility.recent}
                            onPredefinedVisibleChange={(visible: boolean) => (
                                setVisibility({ ...defaultVisibility, predefined: visible })
                            )}
                            onBuilderVisibleChange={(visible: boolean) => (
                                setVisibility({ ...defaultVisibility, builder: visible })
                            )}
                            onRecentVisibleChange={(visible: boolean) => (
                                setVisibility({ ...defaultVisibility, builder: visibility.builder, recent: visible })
                            )}
                        />
                    </Form.Item>
                </Col>
            </Row>
            <Divider />
            <Row className='cvat-quality-settings-title'>
                <Text strong>
                    Job validation
                </Text>
                <CVATTooltip title={jobValidationTooltip} className='cvat-settings-tooltip'>
                    <QuestionCircleOutlined
                        className='cvat-quality-settings-tooltip-icon'
                    />
                </CVATTooltip>
            </Row>
            <Row>
                <Col span={12}>
                    <Form.Item
                        name='maxValidationsPerJob'
                        label='Max validations per job'
                        rules={[{ required: true, message: 'This field is required' }]}
                    >
                        <InputNumber
                            min={0}
                            max={100}
                            precision={0}
                        />
                    </Form.Item>
                </Col>
            </Row>
            <Divider />
            <Row className='cvat-quality-settings-title'>
                <Text strong>
                    Requirements
                </Text>
                <CVATTooltip title='Configure quality requirements used by reports' className='cvat-settings-tooltip'>
                    <QuestionCircleOutlined
                        className='cvat-quality-settings-tooltip-icon'
                    />
                </CVATTooltip>
            </Row>
            <QualityRequirementsEditor
                form={form}
                settings={settings}
                disabled={disabled}
                onReload={onReload}
                onCreateRequirement={(parentRequirement: QualityRequirement) => {
                    setRequirementFormMode({ type: 'create', parentRequirement });
                }}
                onEditRequirement={(requirement: QualityRequirement) => {
                    setRequirementFormMode({ type: 'edit', requirement });
                }}
                onCopyRequirement={(sourceRequirement: QualityRequirement) => {
                    const parentRequirement = typeof sourceRequirement.parentRequirementId === 'number' ?
                        settings.requirements.find((item) => item.id === sourceRequirement.parentRequirementId) :
                        sourceRequirement;

                    if (parentRequirement) {
                        setRequirementFormMode({ type: 'copy', sourceRequirement, parentRequirement });
                    }
                }}
            />
        </Form>
    );
}
