// Copyright (C) 2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { QuestionCircleOutlined } from '@ant-design/icons/lib/icons';
import Text from 'antd/lib/typography/Text';
import InputNumber from 'antd/lib/input-number';
import { Col, Row } from 'antd/lib/grid';
import Divider from 'antd/lib/divider';
import Form, { FormInstance } from 'antd/lib/form';
import Button from 'antd/lib/button';
import CVATTooltip from 'components/common/cvat-tooltip';
import { ConsensusSettings } from 'cvat-core-wrapper';

interface Props {
    form: FormInstance;
    settings: ConsensusSettings;
    onSave: () => void;
}

export default function ConsensusSettingsForm(props: Readonly<Props>): JSX.Element | null {
    const { form, settings, onSave } = props;

    const initialValues = {
        quorum: settings.quorum * 100,
        iouThreshold: settings.iouThreshold * 100,
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
        <>
            {makeTooltipFragment('Quorum', settings.descriptions.quorum.replace(
                'required share of',
                'required percent of',
            ))}
        </>,
    );

    const shapeComparisonTooltip = makeTooltip(
        <>
            {makeTooltipFragment('Min overlap threshold (IoU)', settings.descriptions.iouThreshold)}
        </>,
    );

    return (
        <Form
            form={form}
            layout='vertical'
            className='cvat-consensus-settings-form'
            initialValues={initialValues}
        >
            <Row justify='end' className='cvat-consensus-settings-save-btn'>
                <Col>
                    <Button onClick={onSave} type='primary'>
                        Save
                    </Button>
                </Col>
            </Row>
            <Row className='cvat-consensus-settings-title'>
                <Text strong>General</Text>
                <CVATTooltip
                    title={generalTooltip}
                    className='cvat-settings-tooltip'
                    overlayStyle={{ maxWidth: '500px' }}
                >
                    <QuestionCircleOutlined style={{ opacity: 0.5 }} />
                </CVATTooltip>
            </Row>
            <Row>
                <Col span={6}>
                    <Form.Item
                        name='quorum'
                        label='Quorum (%)'
                        rules={[{ required: true, message: 'This field is required' }]}
                    >
                        <InputNumber min={0} max={100} precision={0} />
                    </Form.Item>
                </Col>
            </Row>
            <Divider />
            <Row className='cvat-consensus-settings-title'>
                <Text strong>Shape comparison</Text>
                <CVATTooltip
                    title={shapeComparisonTooltip}
                    className='cvat-settings-tooltip'
                    overlayStyle={{ maxWidth: '500px' }}
                >
                    <QuestionCircleOutlined style={{ opacity: 0.5 }} />
                </CVATTooltip>
            </Row>
            <Row>
                <Col span={6}>
                    <Form.Item
                        name='iouThreshold'
                        label='Min Overlap (%)'
                        rules={[{ required: true, message: 'This field is required' }]}
                    >
                        <InputNumber min={0} max={100} precision={0} />
                    </Form.Item>
                </Col>
            </Row>
        </Form>
    );
}
