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
import { QualityRequirement, QualitySettings } from 'cvat-core-wrapper';
import { defaultVisibility, ResourceFilterHOC } from 'components/resource-sorting-filtering';
import {
    localStorageRecentKeyword, localStorageRecentCapacity, config,
} from './jobs-filter-configuration';
import QualityRequirementsEditor from './quality-requirements-editor';
import QualityRequirementForm from './quality-requirement-form';

interface Props {
    form: FormInstance;
    settings: QualitySettings;
    disabled: boolean;
    onSave: () => void;
    onReload: () => Promise<void>;
    onRequirementFormVisibilityChange: (visible: boolean) => void;
}

type RequirementFormMode =
    { type: 'list' } |
    { type: 'create'; parentRequirement: QualityRequirement } |
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
        targetMetric: settings.targetMetric,
        targetMetricThreshold: settings.targetMetricThreshold * 100,

        maxValidationsPerJob: settings.maxValidationsPerJob,

        iouThreshold: settings.iouThreshold * 100,
        compareAttributes: settings.compareAttributes,
        emptyIsAnnotated: settings.emptyIsAnnotated,

        oksSigma: settings.oksSigma * 100,
        pointSizeBase: settings.pointSizeBase,

        lineThickness: settings.lineThickness * 100,
        lineOrientationThreshold: settings.lineOrientationThreshold * 100,
        compareLineOrientation: settings.compareLineOrientation,

        compareGroups: settings.compareGroups,
        groupMatchThreshold: settings.groupMatchThreshold * 100,

        checkCoveredAnnotations: settings.checkCoveredAnnotations,
        objectVisibilityThreshold: settings.objectVisibilityThreshold * 100,
        panopticComparison: settings.panopticComparison,

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
                requirement={requirementFormMode.type === 'edit' ? requirementFormMode.requirement : null}
                parentRequirement={
                    requirementFormMode.type === 'create' ? requirementFormMode.parentRequirement : null
                }
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
                settings={settings}
                disabled={disabled}
                onReload={onReload}
                onCreateRequirement={(parentRequirement: QualityRequirement) => {
                    setRequirementFormMode({ type: 'create', parentRequirement });
                }}
                onEditRequirement={(requirement: QualityRequirement) => {
                    setRequirementFormMode({ type: 'edit', requirement });
                }}
            />
        </Form>
    );
}
