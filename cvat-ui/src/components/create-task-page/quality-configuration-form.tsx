// Copyright (C) 2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { RefObject } from 'react';
import Input from 'antd/lib/input';
import Form, { FormInstance } from 'antd/lib/form';
import { PercentageOutlined } from '@ant-design/icons';
import Radio from 'antd/lib/radio';
import { FrameSelectionMethod } from 'components/create-job-page/job-form';
import { Col, Row } from 'antd/lib/grid';
import Select from 'antd/lib/select';

export interface QualityConfiguration {
    validationMethod: ValidationMethod;
    validationFramesPercent: number;
    validationFramesPerJob: number;
    frameSelectionMethod: FrameSelectionMethod;
}

interface Props {
    onSubmit(values: QualityConfiguration): Promise<void>;
    initialValues: QualityConfiguration;
    validationMethod: ValidationMethod;
    onChangeValidationMethod: (method: ValidationMethod) => void;
}

export enum ValidationMethod {
    NONE = 'none',
    GT = 'gt_job',
    HONEYPOTS = 'gt_pool',
}

export default class QualityConfigurationForm extends React.PureComponent<Props> {
    private formRef: RefObject<FormInstance>;

    public constructor(props: Props) {
        super(props);
        this.formRef = React.createRef<FormInstance>();
    }

    public submit(): Promise<void> {
        const { onSubmit } = this.props;
        if (this.formRef.current) {
            return this.formRef.current.validateFields().then((values: QualityConfiguration) => {
                onSubmit(values);
            });
        }

        return Promise.reject(new Error('Qualiuty form ref is empty'));
    }

    public render(): JSX.Element {
        const { initialValues, validationMethod, onChangeValidationMethod } = this.props;

        let paramsBlock: JSX.Element | null = null;
        if (validationMethod === ValidationMethod.GT) {
            paramsBlock = (
                <>
                    <Col>
                        <Form.Item
                            name='frameSelectionMethod'
                            label='Frame selection method'
                            rules={[{ required: true, message: 'Please, specify frame selection method' }]}
                        >
                            <Select
                                className='cvat-select-frame-selection-method'
                            >
                                <Select.Option value={FrameSelectionMethod.RANDOM}>
                                    Random
                                </Select.Option>
                                <Select.Option value={FrameSelectionMethod.RANDOM_PER_JOB}>
                                    Random per job
                                </Select.Option>
                            </Select>
                        </Form.Item>
                    </Col>
                    <Col span={7}>
                        <Form.Item
                            label='Quantity (%)'
                            name='validationFramesPercent'
                            rules={[
                                {
                                    required: true,
                                    message: 'The field is required.',
                                },
                            ]}
                        >
                            <Input size='large' type='number' min={0} max={100} suffix={<PercentageOutlined />} />
                        </Form.Item>
                    </Col>
                </>
            );
        } else if (validationMethod === ValidationMethod.HONEYPOTS) {
            paramsBlock = (
                <Row>
                    <Col span={7}>
                        <Form.Item
                            label='Overhead per job (%)'
                            name='validationFramesPerJob'
                            rules={[
                                {
                                    required: true,
                                    message: 'The field is required.',
                                },
                            ]}
                        >
                            <Input size='large' type='number' min={0} max={100} suffix={<PercentageOutlined />} />
                        </Form.Item>
                    </Col>
                    <Col span={7} offset={1}>
                        <Form.Item
                            label='Total honeypots (%)'
                            name='validationFramesPercent'
                            rules={[
                                {
                                    required: true,
                                    message: 'The field is required.',
                                },
                            ]}
                        >
                            <Input size='large' type='number' min={0} max={100} suffix={<PercentageOutlined />} />
                        </Form.Item>
                    </Col>
                </Row>
            );
        }

        return (
            <Form
                layout='vertical'
                initialValues={initialValues}
                ref={this.formRef}
            >
                <Form.Item
                    label='Validation method'
                    name='validationMethod'
                    rules={[{ required: true }]}
                >
                    <Radio.Group
                        buttonStyle='solid'
                        onChange={(e) => {
                            onChangeValidationMethod(e.target.value);
                        }}
                    >
                        <Radio.Button value={ValidationMethod.NONE} key={ValidationMethod.NONE}>
                            None
                        </Radio.Button>
                        <Radio.Button value={ValidationMethod.GT} key={ValidationMethod.GT}>
                            Ground Truth
                        </Radio.Button>
                        <Radio.Button value={ValidationMethod.HONEYPOTS} key={ValidationMethod.HONEYPOTS}>
                            Honeypots
                        </Radio.Button>
                    </Radio.Group>
                </Form.Item>
                { paramsBlock }
            </Form>
        );
    }
}
