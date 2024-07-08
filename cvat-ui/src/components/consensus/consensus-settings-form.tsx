// Copyright (C) 2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React, { useCallback } from 'react';
import { QuestionCircleOutlined } from '@ant-design/icons/lib/icons';
import Text from 'antd/lib/typography/Text';
import InputNumber from 'antd/lib/input-number';
import { Col, Row } from 'antd/lib/grid';
import Form from 'antd/lib/form';
import CVATTooltip from 'components/common/cvat-tooltip';
import { ConsensusSettings } from 'cvat-core-wrapper';
import { Button } from 'antd/lib';
import notification from 'antd/lib/notification';

interface Props {
    settings: ConsensusSettings | null;
    setConsensusSettings: (settings: ConsensusSettings) => void;
}

export default function ConsensusSettingsForm(props: Props): JSX.Element | null {
    const { settings, setConsensusSettings } = props;

    if (!settings) {
        return (
            <Text>No quality settings</Text>
        );
    }

    const [form] = Form.useForm();

    const initialValues = {
        iouThreshold: settings.iouThreshold * 100,
        agreementScoreThreshold: settings.agreementScoreThreshold * 100,
        quorum: settings.quorum,
    };

    const onSave = useCallback(async () => {
        try {
            if (settings) {
                const values = await form.validateFields();

                settings.iouThreshold = values.iouThreshold / 100;
                settings.quorum = values.quorum;
                settings.agreementScoreThreshold = values.agreementScoreThreshold / 100;

                try {
                    notification.info({
                        message: 'Updating Consensus Settings',
                    });
                    const responseSettings = await settings.save();
                    setConsensusSettings(responseSettings);
                } catch (error: unknown) {
                    notification.error({
                        message: 'Could not save consensus settings',
                        description: typeof Error === 'object' ? (error as object).toString() : '',
                    });
                    throw error;
                }
                await settings.save();
                notification.info({
                    message: 'Consensus Settings have been updated',
                });
            }

            return settings;
        } catch (e) {
            return false;
        }
    }, [settings]);

    const generalTooltip = (
        <div className='cvat-analytics-settings-tooltip-inner'>
            <Text>
                Min overlap threshold(IoU) is used for distinction between matched / unmatched shapes.
            </Text>
            <Text>
                Agreement score threshold is used for distinction between strong / weak consensus.
            </Text>
            <Text>
                Quorum is used for voting a label and attribute results to be counted
            </Text>
        </div>
    );

    return (
        <Form
            form={form}
            layout='vertical'
            initialValues={initialValues}
        >
            <Row className='cvat-quality-settings-title'>
                <Text strong>
                    Consensus Settings
                </Text>
                <CVATTooltip title={generalTooltip} className='cvat-analytics-tooltip' overlayStyle={{ maxWidth: '500px' }}>
                    <QuestionCircleOutlined
                        style={{ opacity: 0.5 }}
                    />
                </CVATTooltip>
            </Row>
            <Row>
                <Col span={12}>
                    <Form.Item
                        name='iouThreshold'
                        label='Min Overlap Threshold (%)'
                        rules={[{ required: true }]}
                    >
                        <InputNumber min={0} max={100} precision={0} />
                    </Form.Item>
                </Col>
                <Col span={12}>
                    <Form.Item
                        name='agreementScoreThreshold'
                        label='Agreement Score Threshold (%)'
                        rules={[{ required: true }]}
                    >
                        <InputNumber min={0} max={100} precision={0} />
                    </Form.Item>
                </Col>
            </Row>
            <Row>
                <Col span={12}>
                    <Form.Item
                        name='quorum'
                        label='Quorum'
                        rules={[{ required: true }]}
                    >
                        <InputNumber min={0} max={10} precision={0} step={1} />
                    </Form.Item>
                </Col>
            </Row>
            <Row>
                <Col span={7} offset={5}>
                    <Button
                        type='default'
                        onClick={() => {
                            form.resetFields();
                        }}
                        className='cvat-button-reset-settings'
                    >
                        Reset Settings
                    </Button>
                </Col>
                <Col span={11} offset={1}>
                    <Button
                        type='default'
                        onClick={onSave}
                    >
                        Save
                    </Button>
                </Col>
            </Row>
        </Form>
    );
}
