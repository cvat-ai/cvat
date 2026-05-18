// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { RefObject } from 'react';
import Input from 'antd/lib/input';
import Form, { FormInstance } from 'antd/lib/form';
import { PercentageOutlined } from '@ant-design/icons';
import Radio from 'antd/lib/radio';
import { Col, Row } from 'antd/lib/grid';
import Select from 'antd/lib/select';

import { FrameSelectionMethod } from 'components/create-job-page/job-form';

export interface QualityConfiguration {
    validationMode: ValidationMode;
    validationFramesPercent?: number;
    validationFramesPerJobPercent?: number;
    frameSelectionMethod: FrameSelectionMethod;
}

interface Props {
    initialValues: QualityConfiguration;
    frameSelectionMethod: FrameSelectionMethod;
    validationMode: ValidationMode;
    onSubmit(values: QualityConfiguration): Promise<void>;
    onChangeFrameSelectionMethod: (method: FrameSelectionMethod) => void;
    onChangeValidationMode: (method: ValidationMode) => void;
}

export enum ValidationMode {
    NONE = 'none',
    GT = 'gt',
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
            return this.formRef.current.validateFields().then((values: QualityConfiguration) => onSubmit({
                ...values,
                frameSelectionMethod: values.validationMode === ValidationMode.HONEYPOTS ?
                    FrameSelectionMethod.RANDOM : values.frameSelectionMethod,
                ...(typeof values.validationFramesPercent === 'number' ? {
                    validationFramesPercent: values.validationFramesPercent / 100,
                } : {}),
                ...(typeof values.validationFramesPerJobPercent === 'number' ? {
                    validationFramesPerJobPercent: values.validationFramesPerJobPercent / 100,
                } : {}),
            }),
            );
        }

        return Promise.reject(new Error('Quality form ref is empty'));
    }

    public resetFields(): void {
        this.formRef.current?.resetFields(['validationFramesPercent', 'validationFramesPerJobPercent', 'frameSelectionMethod']);
    }

    private gtParamsBlock(): JSX.Element {
        const { frameSelectionMethod, onChangeFrameSelectionMethod } = this.props;

        return (
            <>
                <Col>
                    <Form.Item
                        name='frameSelectionMethod'
                        label='Frame selection method'
                        rules={[{ required: true, message: 'Please, specify frame selection method' }]}
                    >
                        <Select
                            className='cvat-select-frame-selection-method'
                            onChange={onChangeFrameSelectionMethod}
                        >
                            <Select.Option value={FrameSelectionMethod.RANDOM}>Random</Select.Option>
                            <Select.Option value={FrameSelectionMethod.RANDOM_PER_JOB}>Random per job</Select.Option>
                        </Select>
                    </Form.Item>
                </Col>

                {
                    frameSelectionMethod === FrameSelectionMethod.RANDOM && (
                        <Col span={7}>
                            <Form.Item
                                label='Quantity'
                                name='validationFramesPercent'
                                normalize={(value) => +value}
                                rules={[
                                    { required: true, message: 'The field is required' },
                                    {
                                        type: 'number', min: 0, max: 100, message: 'Value is not valid',
                                    },
                                ]}
                            >
                                <Input
                                    size='large'
                                    type='number'
                                    min={0}
                                    max={100}
                                    suffix={<PercentageOutlined />}
                                />
                            </Form.Item>
                        </Col>
                    )
                }
                {
                    frameSelectionMethod === FrameSelectionMethod.RANDOM_PER_JOB && (
                        <Col span={7}>
                            <Form.Item
                                label='Quantity per job'
                                name='validationFramesPerJobPercent'
                                normalize={(value) => +value}
                                rules={[
                                    { required: true, message: 'The field is required' },
                                    {
                                        type: 'number', min: 0, max: 100, message: 'Value is not valid',
                                    },
                                ]}
                            >
                                <Input
                                    size='large'
                                    type='number'
                                    min={0}
                                    max={100}
                                    suffix={<PercentageOutlined />}
                                />
                            </Form.Item>
                        </Col>
                    )
                }
            </>
        );
    }

    private honeypotsParamsBlock(): JSX.Element {
        return (
            <Row>
                <Col span={7}>
                    <Form.Item
                        label='Total honeypots'
                        name='validationFramesPercent'
                        normalize={(value) => +value}
                        rules={[
                            { required: true, message: 'The field is required' },
                            {
                                type: 'number', min: 0, max: 100, message: 'Value is not valid',
                            },
                        ]}
                    >
                        <Input size='large' type='number' min={0} max={100} suffix={<PercentageOutlined />} />
                    </Form.Item>
                </Col>
                <Col span={7} offset={1}>
                    <Form.Item
                        label='Overhead per job'
                        name='validationFramesPerJobPercent'
                        normalize={(value) => +value}
                        rules={[
                            { required: true, message: 'The field is required' },
                            {
                                type: 'number', min: 0, max: 100, message: 'Value is not valid',
                            },
                        ]}
                    >
                        <Input size='large' type='number' min={0} max={100} suffix={<PercentageOutlined />} />
                    </Form.Item>
                </Col>
            </Row>
        );
    }

    public render(): JSX.Element {
        const { initialValues, validationMode, onChangeValidationMode } = this.props;

        let paramsBlock: JSX.Element | null = null;
        if (validationMode === ValidationMode.GT) {
            paramsBlock = this.gtParamsBlock();
        } else if (validationMode === ValidationMode.HONEYPOTS) {
            paramsBlock = this.honeypotsParamsBlock();
        }

        return (
            <Form
                layout='vertical'
                initialValues={initialValues}
                ref={this.formRef}
            >
                <Form.Item
                    label='Validation mode'
                    name='validationMode'
                    rules={[{ required: true }]}
                >
                    <Radio.Group
                        buttonStyle='solid'
                        onChange={(e) => {
                            onChangeValidationMode(e.target.value);
                        }}
                    >
                        <Radio.Button value={ValidationMode.NONE} key={ValidationMode.NONE}>
                            None
                        </Radio.Button>
                        <Radio.Button value={ValidationMode.GT} key={ValidationMode.GT}>
                            Ground Truth
                        </Radio.Button>
                        <Radio.Button value={ValidationMode.HONEYPOTS} key={ValidationMode.HONEYPOTS}>
                            Honeypots
                        </Radio.Button>
                    </Radio.Group>
                </Form.Item>
                { paramsBlock }
            </Form>
        );
    }
}
