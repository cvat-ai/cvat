// Copyright (C) 2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useCallback, useState } from 'react';
import { QuestionCircleOutlined } from '@ant-design/icons/lib/icons';
import Text from 'antd/lib/typography/Text';
import InputNumber from 'antd/lib/input-number';
import { Col, Row } from 'antd/lib/grid';
import Form from 'antd/lib/form';
import CVATTooltip from 'components/common/cvat-tooltip';
import { ConsensusSettings } from 'cvat-core-wrapper';
import { Button } from 'antd/lib';
import notification from 'antd/lib/notification';
import { LoadingOutlined } from '@ant-design/icons';

interface Props {
    settings: ConsensusSettings | null;
    setConsensusSettings: (settings: ConsensusSettings) => void;
}

export default function ConsensusSettingsForm(props: Props): JSX.Element | null {
    const [form] = Form.useForm();
    const { settings, setConsensusSettings } = props;
    const [updatingConsensusSetting, setUpdatingConsensusSetting] = useState<boolean>(false);

    if (!settings) {
        return (
            <Text>No quality settings</Text>
        );
    }

    const initialValues = {
        iouThreshold: settings.iouThreshold * 100,
        agreementScoreThreshold: settings.agreementScoreThreshold * 100,
        quorum: settings.quorum,
        sigma: settings.sigma * 100,
    };

    const onSave = useCallback(async () => {
        try {
            if (settings) {
                const values = await form.validateFields();

                settings.iouThreshold = values.iouThreshold / 100;
                settings.quorum = values.quorum;
                settings.agreementScoreThreshold = values.agreementScoreThreshold / 100;
                settings.sigma = values.sigma / 100;

                try {
                    const responseSettings = await settings.save();
                    setUpdatingConsensusSetting(true);
                    setConsensusSettings(responseSettings);
                } catch (error: unknown) {
                    notification.error({
                        message: 'Could not save consensus settings',
                        description: typeof Error === 'object' ? (error as object).toString() : '',
                    });
                    throw error;
                }
                await settings.save();
            }

            return settings;
        } catch (e) {
            return false;
        } finally {
            setUpdatingConsensusSetting(false);
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
            <Text>
                Sigma is used while calculating the OKS distance
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
                <Col span={12}>
                    <Form.Item
                        name='sigma'
                        label='Sigma'
                        rules={[{ required: true }]}
                    >
                        <InputNumber min={5} max={20} precision={0} />
                    </Form.Item>
                </Col>
            </Row>
            <Row>
                <Col span={11} offset={6}>
                    <Button
                        type='primary'
                        disabled={updatingConsensusSetting}
                        icon={updatingConsensusSetting && <LoadingOutlined />}
                        onClick={onSave}
                    >
                        Save
                    </Button>
                </Col>
            </Row>
        </Form>
    );
}
