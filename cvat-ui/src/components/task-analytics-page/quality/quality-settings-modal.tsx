// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { CombinedState } from 'reducers';
import Text from 'antd/lib/typography/Text';
import Modal from 'antd/lib/modal';
import InputNumber from 'antd/lib/input-number';
import { analyticsActions, updateQualitySettingsAsync } from 'actions/analytics-actions';
import { Col, Row } from 'antd/lib/grid';
import { Divider } from 'antd';
import Form from 'antd/lib/form';
import Checkbox from 'antd/lib/checkbox/Checkbox';

export default function QualitySettingsModal(): JSX.Element | null {
    const visible = useSelector((state: CombinedState) => state.analytics.quality.settings.modalVisible);
    const loading = useSelector((state: CombinedState) => state.analytics.quality.settings.fetching);
    const settings = useSelector((state: CombinedState) => state.analytics.quality.settings.current);
    const [form] = Form.useForm();

    const dispatch = useDispatch();

    const onOk = useCallback(async () => {
        try {
            if (settings) {
                const values = await form.validateFields();
                settings.lineThickness = values.lineThickness / 100;
                settings.lineOrientationThreshold = values.lineOrientationThreshold / 100;
                settings.orientedLines = values.orientedLines;

                settings.lowOverlapThreshold = values.lowOverlapThreshold / 100;
                settings.iouThreshold = values.iouThreshold / 100;
                settings.oksSigma = values.oksSigma / 100;

                settings.orientedLines = values.orientedLines;
                settings.groupMatchThreshold = values.groupMatchThreshold / 100;

                settings.checkCoveredAnnotations = values.checkCoveredAnnotations;
                settings.objectVisibilityThreshold = values.objectVisibilityThreshold / 100;

                settings.compareAttributes = values.compareAttributes;
                settings.panopticComparison = values.panopticComparison;

                await dispatch(updateQualitySettingsAsync(settings));
                await dispatch(analyticsActions.switchQualitySettingsVisible(false));
            }
            return settings;
        } catch (e) {
            return false;
        }
    }, [settings]);

    const onCancel = useCallback(() => {
        dispatch(analyticsActions.switchQualitySettingsVisible(false));
    }, []);

    return (
        <Modal
            okType='primary'
            okText='Save'
            cancelText='Cancel'
            title={<Text strong>Annotation Settings Quality</Text>}
            visible={visible}
            onOk={onOk}
            onCancel={onCancel}
            confirmLoading={loading}
            className='cvat-modal-quality-settings'
        >
            { settings ? (
                <Form
                    form={form}
                    layout='vertical'
                    initialValues={{
                        lineThickness: settings.lineThickness * 100,
                        lineOrientationThreshold: settings.lineOrientationThreshold * 100,
                        orientedLines: settings.orientedLines,

                        lowOverlapThreshold: settings.lowOverlapThreshold * 100,
                        iouThreshold: settings.iouThreshold * 100,
                        oksSigma: settings.oksSigma * 100,

                        compareGroups: settings.compareGroups,
                        groupMatchThreshold: settings.groupMatchThreshold * 100,

                        checkCoveredAnnotations: settings.checkCoveredAnnotations,
                        objectVisibilityThreshold: settings.objectVisibilityThreshold * 100,

                        compareAttributes: settings.compareAttributes,
                        panopticComparison: settings.panopticComparison,
                    }}
                >
                    <Row className='cvat-quality-settings-title'>
                        <Text strong>
                            General
                        </Text>
                    </Row>
                    <Row>
                        <Col span={12}>
                            <Form.Item
                                name='iouThreshold'
                                label='Min overlap threshold (%)'
                                rules={[{ required: true }]}
                            >
                                <InputNumber min={0} max={100} />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item
                                name='lowOverlapThreshold'
                                label='Low overlap threshold (%)'
                                rules={[{ required: true }]}
                            >
                                <InputNumber min={0} max={100} />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Row>
                        <Col span={12}>
                            <Form.Item
                                name='compareAttributes'
                                valuePropName='checked'
                                rules={[{ required: true }]}
                            >
                                <Checkbox>
                                    <Text className='cvat-text-color'>Compare attributes</Text>
                                </Checkbox>
                            </Form.Item>
                        </Col>
                    </Row>
                    <Divider />
                    <Row className='cvat-quality-settings-title'>
                        <Text strong>
                            Keypoint Comparison
                        </Text>
                    </Row>
                    <Row>
                        <Col span={12}>
                            <Form.Item
                                name='oksSigma'
                                label='OKS sigma'
                                rules={[{ required: true }]}
                            >
                                <InputNumber min={0} max={100} />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Divider />
                    <Row className='cvat-quality-settings-title'>
                        <Text strong>
                            Line Comparison
                        </Text>
                    </Row>
                    <Row>
                        <Col span={12}>
                            <Form.Item
                                name='lineThickness'
                                label='Relative thickness (frame side %)'
                                rules={[{ required: true }]}
                            >
                                <InputNumber min={0} max={1000} />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Row>
                        <Col span={12}>
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
                        <Col span={12}>
                            <Form.Item
                                name='lineOrientationThreshold'
                                label='Min similarity gain (%)'
                                rules={[{ required: true }]}
                            >
                                <InputNumber min={0} max={100} />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Divider />
                    <Row className='cvat-quality-settings-title'>
                        <Text strong>
                            Group Comparison
                        </Text>
                    </Row>
                    <Row>
                        <Col span={12}>
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
                        <Col span={12}>
                            <Form.Item
                                name='groupMatchThreshold'
                                label='Min group match threshold (%)'
                                rules={[{ required: true }]}
                            >
                                <InputNumber min={0} max={100} />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Divider />
                    <Row className='cvat-quality-settings-title'>
                        <Text strong>
                            Segmentation Comparison
                        </Text>
                    </Row>
                    <Row>
                        <Col span={12}>
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
                        <Col span={12}>
                            <Form.Item
                                name='objectVisibilityThreshold'
                                label='Min visibility threshold (area %)'
                                rules={[{ required: true }]}
                            >
                                <InputNumber min={0} max={100} />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Row>
                        <Col span={12}>
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
                </Form>
            ) : (
                <Text>No quality settings</Text>
            )}
        </Modal>
    );
}
