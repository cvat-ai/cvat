// Copyright (C) 2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useCallback, useState } from 'react';
import { QuestionCircleOutlined } from '@ant-design/icons/lib/icons';
import Text from 'antd/lib/typography/Text';
import InputNumber from 'antd/lib/input-number';
import { Col, Row } from 'antd/lib/grid';
import Form from 'antd/lib/form';
import { Button, Divider } from 'antd/lib';
import notification from 'antd/lib/notification';
import { LoadingOutlined } from '@ant-design/icons';
import CVATTooltip from 'components/common/cvat-tooltip';
import { ConsensusSettings } from 'cvat-core-wrapper';

interface Props {
    settings: ConsensusSettings;
    setConsensusSettings: (settings: ConsensusSettings) => void;
}

export default function ConsensusSettingsForm(props: Props): JSX.Element | null {
    const [form] = Form.useForm();
    const { settings, setConsensusSettings } = props;
    const [updatingConsensusSetting, setUpdatingConsensusSetting] = useState<boolean>(false);

    const initialValues = {
        iouThreshold: settings.iouThreshold * 100,
        quorum: settings.quorum,
    };

    const onSave = useCallback(async () => {
        try {
            if (settings) {
                const values = await form.validateFields();

                settings.iouThreshold = values.iouThreshold / 100;
                settings.quorum = values.quorum;

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
                Quorum is the minimum number of annotations that should be present in a cluster for it to be considered.
            </Text>
        </div>
    );

    const shapeComparisonTooltip = (
        <div className='cvat-analytics-settings-tooltip-inner'>
            <Text>Min overlap threshold(IoU) is used for distinction between matched / unmatched shapes.</Text>
        </div>
    );

    return (
        <Form
            form={form}
            layout='vertical'
            className='cvat-quality-settings-form'
            initialValues={initialValues}
        >
            <Row justify='end' className='cvat-quality-settings-save-btn'>
                <Col>
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
            <Row className='cvat-quality-settings-title'>
                <Text strong>General</Text>
                <CVATTooltip
                    title={generalTooltip}
                    className='cvat-analytics-tooltip'
                    overlayStyle={{ maxWidth: '500px' }}
                >
                    <QuestionCircleOutlined style={{ opacity: 0.5 }} />
                </CVATTooltip>
            </Row>
            <Row>
                <Col span={6}>
                    <Form.Item name='quorum' label='Quorum (%)' rules={[{ required: true }]}>
                        <InputNumber min={0} max={100} precision={0} />
                    </Form.Item>
                </Col>
            </Row>
            <Divider />
            <Row className='cvat-quality-settings-title'>
                <Text strong>Shape comparison</Text>
                <CVATTooltip
                    title={shapeComparisonTooltip}
                    className='cvat-analytics-tooltip'
                    overlayStyle={{ maxWidth: '500px' }}
                >
                    <QuestionCircleOutlined style={{ opacity: 0.5 }} />
                </CVATTooltip>
            </Row>
            <Row>
                <Col span={12}>
                    <Form.Item name='iouThreshold' label='Min Overlap (%)' rules={[{ required: true }]}>
                        <InputNumber min={0} max={100} precision={0} />
                    </Form.Item>
                </Col>
            </Row>
        </Form>
    );
}
