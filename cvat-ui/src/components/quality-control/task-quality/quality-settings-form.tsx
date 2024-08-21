// Copyright (C) 2023-2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { QuestionCircleOutlined } from '@ant-design/icons/lib/icons';
import Text from 'antd/lib/typography/Text';
import InputNumber from 'antd/lib/input-number';
import { Col, Row } from 'antd/lib/grid';
import Divider from 'antd/lib/divider';
import Form, { FormInstance } from 'antd/lib/form';
import Checkbox from 'antd/lib/checkbox/Checkbox';
import CVATTooltip from 'components/common/cvat-tooltip';
import { QualitySettings, TargetMetric } from 'cvat-core-wrapper';
import { Button, Select } from 'antd/lib';

interface FormProps {
    form: FormInstance;
    settings: QualitySettings;
    onSave: () => void;
}

export default function QualitySettingsForm(props: FormProps): JSX.Element | null {
    const {
        form, settings, onSave,
    } = props;

    const initialValues = {
        targetMetric: settings.targetMetric,
        targetMetricThreshold: settings.targetMetricThreshold * 100,

        maxValidationsPerJob: settings.maxValidationsPerJob,

        lowOverlapThreshold: settings.lowOverlapThreshold * 100,
        iouThreshold: settings.iouThreshold * 100,
        compareAttributes: settings.compareAttributes,

        oksSigma: settings.oksSigma * 100,

        lineThickness: settings.lineThickness * 100,
        lineOrientationThreshold: settings.lineOrientationThreshold * 100,
        orientedLines: settings.orientedLines,

        compareGroups: settings.compareGroups,
        groupMatchThreshold: settings.groupMatchThreshold * 100,

        checkCoveredAnnotations: settings.checkCoveredAnnotations,
        objectVisibilityThreshold: settings.objectVisibilityThreshold * 100,
        panopticComparison: settings.panopticComparison,
    };

    const generalTooltip = (
        <div className='cvat-analytics-settings-tooltip-inner'>
            <Text>
                Min overlap threshold(IoU) is used for distinction between matched / unmatched shapes.
            </Text>
            <Text>
                Low overlap threshold is used for distinction between strong / weak (low overlap) matches.
            </Text>
        </div>
    );

    const keypointTooltip = (
        <div className='cvat-analytics-settings-tooltip-inner'>
            <Text>
                Object Keypoint Similarity (OKS) is like IoU, but for skeleton points.
            </Text>
            <Text>
                The Sigma value is the percent of the skeleton bbox area ^ 0.5.
                Used as the radius of the circle around a GT point,
                where the checked point is expected to be.
            </Text>
            <Text>
                The value is also used to match single point annotations, in which case
                the bbox is the whole image. For point groups the bbox is taken
                for the whole group.
            </Text>
            <Text>
                If there is a rectangle annotation in the points group or skeleton,
                it is used as the group bbox (supposing the whole group describes a single object).
            </Text>
        </div>
    );

    const linesTooltip = (
        <div className='cvat-analytics-settings-tooltip-inner'>
            <Text>
                Line thickness - thickness of polylines, relatively to the (image area) ^ 0.5.
                The distance to the boundary around the GT line,
                inside of which the checked line points should be.
            </Text>
            <Text>
                Check orientation - Indicates that polylines have direction.
            </Text>
            <Text>
                Min similarity gain - The minimal gain in the GT IoU between the given and reversed line directions
                to consider the line inverted. Only useful with the Check orientation parameter.
            </Text>
        </div>
    );

    const groupTooltip = (
        <div className='cvat-analytics-settings-tooltip-inner'>
            <Text>
                Compare groups - Enables or disables annotation group checks.
            </Text>
            <Text>
                Min group match threshold - Minimal IoU for groups to be considered matching,
                used when the Compare groups is enabled.
            </Text>
        </div>
    );

    const segmentationTooltip = (
        <div className='cvat-analytics-settings-tooltip-inner'>
            <Text>
                Check object visibility - Check for partially-covered annotations.
            </Text>
            <Text>
                Min visibility threshold - Minimal visible area percent of the spatial annotations (polygons, masks)
                for reporting covered annotations, useful with the Check object visibility option.
            </Text>
            <Text>
                Match only visible parts - Use only the visible part of the masks and polygons in comparisons.
            </Text>
        </div>
    );

    const formItems: [JSX.Element, number][] = [];
    formItems.push([
        <>
            <Row className='cvat-quality-settings-title'>
                <Text strong>
                General
                </Text>
            </Row>
            <Row>
                <Col span={7}>
                    <Form.Item
                        name='targetMetric'
                        label='Target metric'
                        rules={[{ required: true }]}
                    >
                        <Select
                            style={{ width: '70%' }}
                            virtual={false}
                        >
                            <Select.Option value={TargetMetric.ACCURACY}>
                                Accuracy
                            </Select.Option>
                            <Select.Option value={TargetMetric.PRECISION}>
                                Precision
                            </Select.Option>
                            <Select.Option value={TargetMetric.RECALL}>
                                Recall
                            </Select.Option>
                        </Select>
                    </Form.Item>
                </Col>
                <Col span={7}>
                    <Form.Item
                        name='targetMetricThreshold'
                        label='Target metric threshold'
                        rules={[{ required: true }]}
                    >
                        <InputNumber min={0} max={100} precision={0} />
                    </Form.Item>
                </Col>
            </Row>
            <Divider />
        </>,
        10]);

    formItems.push([
        <>
            <Row className='cvat-quality-settings-title'>
                <Text strong>
                Job validation
                </Text>
            </Row>
            <Row>
                <Col span={7}>
                    <Form.Item
                        name='maxValidationsPerJob'
                        label='Max validations per job'
                        rules={[{ required: true }]}
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
        </>,
        20]);

    formItems.push([
        <>
            <Row className='cvat-quality-settings-title'>
                <Text strong>
                    Shape comparison
                </Text>
                <CVATTooltip title={generalTooltip} className='cvat-analytics-tooltip' overlayStyle={{ maxWidth: '500px' }}>
                    <QuestionCircleOutlined
                        style={{ opacity: 0.5 }}
                    />
                </CVATTooltip>
            </Row>
            <Row>
                <Col span={7}>
                    <Form.Item
                        name='iouThreshold'
                        label='Min overlap threshold (%)'
                        rules={[{ required: true }]}
                    >
                        <InputNumber min={0} max={100} precision={0} />
                    </Form.Item>
                </Col>
                <Col span={7}>
                    <Form.Item
                        name='lowOverlapThreshold'
                        label='Low overlap threshold (%)'
                        rules={[{ required: true }]}
                    >
                        <InputNumber min={0} max={100} precision={0} />
                    </Form.Item>
                </Col>
            </Row>
            <Divider />
        </>,
        30]);

    formItems.push([
        <>
            <Row className='cvat-quality-settings-title'>
                <Text strong>
                    Keypoint Comparison
                </Text>
                <CVATTooltip title={keypointTooltip} className='cvat-analytics-tooltip' overlayStyle={{ maxWidth: '500px' }}>
                    <QuestionCircleOutlined
                        style={{ opacity: 0.5 }}
                    />
                </CVATTooltip>
            </Row>
            <Row>
                <Col span={7}>
                    <Form.Item
                        name='oksSigma'
                        label='OKS sigma (bbox side %)'
                        rules={[{ required: true }]}
                    >
                        <InputNumber min={0} max={100} precision={0} />
                    </Form.Item>
                </Col>
            </Row>
            <Divider />
        </>,
        40]);

    formItems.push([
        <>
            <Row className='cvat-quality-settings-title'>
                <Text strong>
                    Line Comparison
                </Text>
                <CVATTooltip title={linesTooltip} className='cvat-analytics-tooltip' overlayStyle={{ maxWidth: '500px' }}>
                    <QuestionCircleOutlined
                        style={{ opacity: 0.5 }}
                    />
                </CVATTooltip>
            </Row>
            <Row>
                <Col span={7}>
                    <Form.Item
                        name='lineThickness'
                        label='Relative thickness (frame side %)'
                        rules={[{ required: true }]}
                    >
                        <InputNumber min={0} max={1000} precision={0} />
                    </Form.Item>
                </Col>
            </Row>
            <Row>
                <Col span={7}>
                    <Form.Item
                        name='orientedLines'
                        rules={[{ required: true }]}
                        valuePropName='checked'
                    >
                        <Checkbox>
                            <Text className='cvat-text-color'>Check orientation</Text>
                        </Checkbox>
                    </Form.Item>
                </Col>
                <Col span={7}>
                    <Form.Item
                        name='lineOrientationThreshold'
                        label='Min similarity gain (%)'
                        rules={[{ required: true }]}
                    >
                        <InputNumber min={0} max={100} precision={0} />
                    </Form.Item>
                </Col>
            </Row>
            <Divider />
        </>,
        50]);

    formItems.push([
        <>
            <Row className='cvat-quality-settings-title'>
                <Text strong>
                    Group Comparison
                </Text>
                <CVATTooltip title={groupTooltip} className='cvat-analytics-tooltip' overlayStyle={{ maxWidth: '500px' }}>
                    <QuestionCircleOutlined
                        style={{ opacity: 0.5 }}
                    />
                </CVATTooltip>
            </Row>
            <Row>
                <Col span={7}>
                    <Form.Item
                        name='compareGroups'
                        valuePropName='checked'
                        rules={[{ required: true }]}
                    >
                        <Checkbox>
                            <Text className='cvat-text-color'>Compare groups</Text>
                        </Checkbox>
                    </Form.Item>
                </Col>
                <Col span={7}>
                    <Form.Item
                        name='groupMatchThreshold'
                        label='Min group match threshold (%)'
                        rules={[{ required: true }]}
                    >
                        <InputNumber min={0} max={100} precision={0} />
                    </Form.Item>
                </Col>
            </Row>
            <Divider />
        </>,
        60]);

    formItems.push([
        <>
            <Row className='cvat-quality-settings-title'>
                <Text strong>
                    Segmentation Comparison
                </Text>
                <CVATTooltip title={segmentationTooltip} className='cvat-analytics-tooltip' overlayStyle={{ maxWidth: '500px' }}>
                    <QuestionCircleOutlined
                        style={{ opacity: 0.5 }}
                    />
                </CVATTooltip>
            </Row>
            <Row>
                <Col span={7}>
                    <Form.Item
                        name='checkCoveredAnnotations'
                        valuePropName='checked'
                        rules={[{ required: true }]}
                    >
                        <Checkbox>
                            <Text className='cvat-text-color'>Check object visibility</Text>
                        </Checkbox>
                    </Form.Item>
                </Col>
                <Col span={7}>
                    <Form.Item
                        name='objectVisibilityThreshold'
                        label='Min visibility threshold (area %)'
                        rules={[{ required: true }]}
                    >
                        <InputNumber min={0} max={100} precision={0} />
                    </Form.Item>
                </Col>
            </Row>
            <Row>
                <Col span={7}>
                    <Form.Item
                        name='panopticComparison'
                        valuePropName='checked'
                        rules={[{ required: true }]}
                    >
                        <Checkbox>
                            <Text className='cvat-text-color'>Match only visible parts</Text>
                        </Checkbox>
                    </Form.Item>
                </Col>
            </Row>
        </>,
        70]);

    return (
        <Form
            form={form}
            layout='vertical'
            className='cvat-quality-settings-form'
            initialValues={initialValues}
        >
            <Row justify='end' className='cvat-quality-settings-save-btn'>
                <Col>
                    <Button onClick={onSave} type='primary'>
                        Save
                    </Button>
                </Col>
            </Row>
            { formItems.sort((item1, item2) => item1[1] - item2[1])
                .map((item) => item[0]) }
        </Form>
    );
}
