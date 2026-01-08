// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useState } from 'react';
import { QuestionCircleOutlined } from '@ant-design/icons/lib/icons';
import Text from 'antd/lib/typography/Text';
import InputNumber from 'antd/lib/input-number';
import { Col, Row } from 'antd/lib/grid';
import Divider from 'antd/lib/divider';
import Form, { FormInstance } from 'antd/lib/form';
import Checkbox from 'antd/lib/checkbox/Checkbox';
import Select from 'antd/lib/select';
import CVATTooltip from 'components/common/cvat-tooltip';
import { QualitySettings, TargetMetric } from 'cvat-core-wrapper';
import { PointSizeBase } from 'cvat-core/src/quality-settings';
import { defaultVisibility, ResourceFilterHOC } from 'components/resource-sorting-filtering';
import {
    localStorageRecentKeyword, localStorageRecentCapacity, config,
} from './jobs-filter-configuration';

interface Props {
    form: FormInstance;
    settings: QualitySettings;
    disabled: boolean;
    onSave: () => void;
}

const FilteringComponent = ResourceFilterHOC(
    config, localStorageRecentKeyword, localStorageRecentCapacity,
);

export default function QualitySettingsForm(props: Readonly<Props>): JSX.Element | null {
    const { form, settings, disabled } = props;

    const [visibility, setVisibility] = useState(defaultVisibility);

    const initialValues = {
        targetMetric: settings.targetMetric,
        targetMetricThreshold: settings.targetMetricThreshold * 100,

        maxValidationsPerJob: settings.maxValidationsPerJob,

        lowOverlapThreshold: settings.lowOverlapThreshold * 100,
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

    const targetMetricDescription = `${settings.descriptions.targetMetric
        .replaceAll(/\* [a-z` -]+[A-Z]+/g, '')
        .replaceAll(/\n/g, '')
    }`;

    const pointSizeBaseDescription = `${settings.descriptions.pointSizeBase
        .substring(0, settings.descriptions.pointSizeBase.indexOf('\n\n\n'))
        .replaceAll(/\n/g, ' ')
    }`;

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
        <>
            {makeTooltipFragment('目标指标', targetMetricDescription)}
            {makeTooltipFragment('目标指标阈值', settings.descriptions.targetMetricThreshold)}
            {makeTooltipFragment('比较属性', settings.descriptions.compareAttributes)}
            {makeTooltipFragment('空帧已标注', settings.descriptions.emptyIsAnnotated)}
            {makeTooltipFragment('作业筛选过滤器', settings.descriptions.jobFilter)}
        </>,
    );

    const jobValidationTooltip = makeTooltip(
        makeTooltipFragment('每个作业最大验证数', settings.descriptions.maxValidationsPerJob),
    );

    const shapeComparisonTooltip = makeTooltip(
        <>
            {makeTooltipFragment('最小重叠阈值 (IoU)', settings.descriptions.iouThreshold)}
            {makeTooltipFragment('低重叠阈值', settings.descriptions.lowOverlapThreshold)}
        </>,
    );

    const keypointTooltip = makeTooltip(
        makeTooltipFragment('对象关键点相似度 (OKS)', settings.descriptions.oksSigma),
    );

    const pointTooltip = makeTooltip(
        makeTooltipFragment('点大小基准', pointSizeBaseDescription),
    );

    const linesTooltip = makeTooltip(
        <>
            {makeTooltipFragment('线条粗细', settings.descriptions.lineThickness)}
            {makeTooltipFragment('检查方向', settings.descriptions.compareLineOrientation)}
            {makeTooltipFragment('最小相似度增益', settings.descriptions.lineOrientationThreshold)}
        </>,
    );

    const groupTooltip = makeTooltip(
        <>
            {makeTooltipFragment('比较分组', settings.descriptions.compareGroups)}
            {makeTooltipFragment('最小分组匹配阈值', settings.descriptions.groupMatchThreshold)}
        </>,
    );

    const segmentationTooltip = makeTooltip(
        <>
            {makeTooltipFragment('检查对象可见性', settings.descriptions.checkCoveredAnnotations)}
            {makeTooltipFragment('最小可见性阈值', settings.descriptions.objectVisibilityThreshold)}
            {makeTooltipFragment('仅匹配可见部分', settings.descriptions.panopticComparison)}
        </>,
    );

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
                    常规
                </Text>
                <CVATTooltip title={generalTooltip} className='cvat-settings-tooltip' overlayStyle={{ maxWidth: '500px' }}>
                    <QuestionCircleOutlined
                        style={{ opacity: 0.5 }}
                    />
                </CVATTooltip>
            </Row>
            <Row>
                <Col span={12}>
                    <Form.Item
                        name='targetMetric'
                        label='目标指标'
                        rules={[{ required: true, message: '此字段为必填项' }]}
                    >
                        <Select
                            style={{ width: '70%' }}
                            virtual={false}
                        >
                            <Select.Option value={TargetMetric.ACCURACY}>
                                准确率
                            </Select.Option>
                            <Select.Option value={TargetMetric.PRECISION}>
                                精确率
                            </Select.Option>
                            <Select.Option value={TargetMetric.RECALL}>
                                召回率
                            </Select.Option>
                        </Select>
                    </Form.Item>
                </Col>
                <Col span={12}>
                    <Form.Item
                        name='targetMetricThreshold'
                        label='目标指标阈值'
                        rules={[{ required: true, message: '此字段为必填项' }]}
                    >
                        <InputNumber min={0} max={100} precision={0} />
                    </Form.Item>
                </Col>
            </Row>
            <Row>
                <Col span={12}>
                    <Form.Item
                        name='compareAttributes'
                        valuePropName='checked'
                        rules={[{ required: true, message: '此字段为必填项' }]}
                    >
                        <Checkbox>
                            <Text className='cvat-text-color'>对比属性</Text>
                        </Checkbox>
                    </Form.Item>
                </Col>
                <Col span={12}>
                    <Form.Item
                        name='emptyIsAnnotated'
                        valuePropName='checked'
                        rules={[{ required: true, message: '此字段为必填项' }]}
                    >
                        <Checkbox>
                            <Text className='cvat-text-color'>空帧也视为已标注</Text>
                        </Checkbox>
                    </Form.Item>
                </Col>
            </Row>
            <Row>
                <Col span={12}>
                    <Form.Item
                        name='jobFilter'
                        label='作业选择过滤器'
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
                    作业验证
                </Text>
                <CVATTooltip title={jobValidationTooltip} className='cvat-settings-tooltip' overlayStyle={{ maxWidth: '500px' }}>
                    <QuestionCircleOutlined
                        style={{ opacity: 0.5 }}
                    />
                </CVATTooltip>
            </Row>
            <Row>
                <Col span={12}>
                    <Form.Item
                        name='maxValidationsPerJob'
                        label='每个作业最大验证次数'
                        rules={[{ required: true, message: '此字段为必填项' }]}
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
                    形状对比
                </Text>
                <CVATTooltip title={shapeComparisonTooltip} className='cvat-settings-tooltip' overlayStyle={{ maxWidth: '500px' }}>
                    <QuestionCircleOutlined
                        style={{ opacity: 0.5 }}
                    />
                </CVATTooltip>
            </Row>
            <Row>
                <Col span={12}>
                    <Form.Item
                        name='iouThreshold'
                        label='最小重叠阈值（%）'
                        rules={[{ required: true, message: '此字段为必填项' }]}
                    >
                        <InputNumber min={0} max={100} precision={0} />
                    </Form.Item>
                </Col>
                <Col span={12}>
                    <Form.Item
                        name='lowOverlapThreshold'
                        label='低重叠阈值（%）'
                        rules={[{ required: true, message: '此字段为必填项' }]}
                    >
                        <InputNumber min={0} max={100} precision={0} />
                    </Form.Item>
                </Col>
            </Row>
            <Divider />
            <Row className='cvat-quality-settings-title'>
                <Text strong>
                    关键点对比
                </Text>
                <CVATTooltip title={keypointTooltip} className='cvat-settings-tooltip' overlayStyle={{ maxWidth: '500px' }}>
                    <QuestionCircleOutlined
                        style={{ opacity: 0.5 }}
                    />
                </CVATTooltip>
            </Row>
            <Row>
                <Col span={12}>
                    <Form.Item
                        name='oksSigma'
                        label='OKS sigma（bbox 边长 %）'
                        rules={[{ required: true, message: '此字段为必填项' }]}
                    >
                        <InputNumber min={0} max={100} precision={0} />
                    </Form.Item>
                </Col>
            </Row>
            <Divider />
            <Row className='cvat-quality-settings-title'>
                <Text strong>
                    点对比
                </Text>
                <CVATTooltip title={pointTooltip} className='cvat-settings-tooltip' overlayStyle={{ maxWidth: '500px' }}>
                    <QuestionCircleOutlined
                        style={{ opacity: 0.5 }}
                    />
                </CVATTooltip>
            </Row>
            <Row>
                <Col span={12}>
                    <Form.Item
                        name='pointSizeBase'
                        label='点大小基准'
                        rules={[{ required: true, message: '此字段为必填项' }]}
                    >
                        <Select
                            style={{ width: '70%' }}
                            virtual={false}
                        >
                            <Select.Option value={PointSizeBase.IMAGE_SIZE}>
                                图像尺寸
                            </Select.Option>
                            <Select.Option value={PointSizeBase.GROUP_BBOX_SIZE}>
                                分组边界框尺寸
                            </Select.Option>
                        </Select>
                    </Form.Item>
                </Col>
            </Row>
            <Divider />
            <Row className='cvat-quality-settings-title'>
                <Text strong>
                    线段对比
                </Text>
                <CVATTooltip title={linesTooltip} className='cvat-settings-tooltip' overlayStyle={{ maxWidth: '500px' }}>
                    <QuestionCircleOutlined
                        style={{ opacity: 0.5 }}
                    />
                </CVATTooltip>
            </Row>
            <Row>
                <Col span={12}>
                    <Form.Item
                        name='lineThickness'
                        label='相对粗细（帧边长 %）'
                        rules={[{ required: true, message: '此字段为必填项' }]}
                    >
                        <InputNumber min={0} max={1000} precision={0} />
                    </Form.Item>
                </Col>
            </Row>
            <Row>
                <Col span={12}>
                    <Form.Item
                        name='compareLineOrientation'
                        rules={[{ required: true, message: '此字段为必填项' }]}
                        valuePropName='checked'
                    >
                        <Checkbox>
                            <Text className='cvat-text-color'>检查方向</Text>
                        </Checkbox>
                    </Form.Item>
                </Col>
                <Col span={12}>
                    <Form.Item
                        name='lineOrientationThreshold'
                        label='最小相似度增益阈值（%）'
                        rules={[{ required: true, message: '此字段为必填项' }]}
                    >
                        <InputNumber min={0} max={100} precision={0} />
                    </Form.Item>
                </Col>
            </Row>
            <Divider />
            <Row className='cvat-quality-settings-title'>
                <Text strong>
                    分组对比
                </Text>
                <CVATTooltip title={groupTooltip} className='cvat-settings-tooltip' overlayStyle={{ maxWidth: '500px' }}>
                    <QuestionCircleOutlined
                        style={{ opacity: 0.5 }}
                    />
                </CVATTooltip>
            </Row>
            <Row>
                <Col span={12}>
                    <Form.Item
                        name='compareGroups'
                        valuePropName='checked'
                        rules={[{ required: true, message: '此字段为必填项' }]}
                    >
                        <Checkbox>
                            <Text className='cvat-text-color'>对比分组</Text>
                        </Checkbox>
                    </Form.Item>
                </Col>
                <Col span={12}>
                    <Form.Item
                        name='groupMatchThreshold'
                        label='最小分组匹配阈值（%）'
                        rules={[{ required: true, message: '此字段为必填项' }]}
                    >
                        <InputNumber min={0} max={100} precision={0} />
                    </Form.Item>
                </Col>
            </Row>
            <Divider />
            <Row className='cvat-quality-settings-title'>
                <Text strong>
                    分割对比
                </Text>
                <CVATTooltip title={segmentationTooltip} className='cvat-settings-tooltip' overlayStyle={{ maxWidth: '500px' }}>
                    <QuestionCircleOutlined
                        style={{ opacity: 0.5 }}
                    />
                </CVATTooltip>
            </Row>
            <Row>
                <Col span={12}>
                    <Form.Item
                        name='checkCoveredAnnotations'
                        valuePropName='checked'
                        rules={[{ required: true, message: '此字段为必填项' }]}
                    >
                        <Checkbox>
                            <Text className='cvat-text-color'>检查对象可见性</Text>
                        </Checkbox>
                    </Form.Item>
                </Col>
                <Col span={12}>
                    <Form.Item
                        name='objectVisibilityThreshold'
                        label='最小可见性阈值（面积 %）'
                        rules={[{ required: true, message: '此字段为必填项' }]}
                    >
                        <InputNumber min={0} max={100} precision={0} />
                    </Form.Item>
                </Col>
            </Row>
            <Row>
                <Col span={12}>
                    <Form.Item
                        name='panopticComparison'
                        valuePropName='checked'
                        rules={[{ required: true, message: '此字段为必填项' }]}
                    >
                        <Checkbox>
                            <Text className='cvat-text-color'>仅匹配可见部分</Text>
                        </Checkbox>
                    </Form.Item>
                </Col>
            </Row>
        </Form>
    );
}
