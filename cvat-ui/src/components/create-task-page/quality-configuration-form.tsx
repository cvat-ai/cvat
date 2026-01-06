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

        return Promise.reject(new Error('质量表单引用为空'));
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
                        label='帧选择方法'
                        rules={[{ required: true, message: '请指定帧选择方法' }]}
                    >
                        <Select
                            className='cvat-select-frame-selection-method'
                            onChange={onChangeFrameSelectionMethod}
                        >
                            <Select.Option value={FrameSelectionMethod.RANDOM}>随机</Select.Option>
                            <Select.Option value={FrameSelectionMethod.RANDOM_PER_JOB}>每个作业随机</Select.Option>
                        </Select>
                    </Form.Item>
                </Col>

                {
                    frameSelectionMethod === FrameSelectionMethod.RANDOM && (
                        <Col span={7}>
                            <Form.Item
                                label='数量'
                                name='validationFramesPercent'
                                normalize={(value) => +value}
                                rules={[
                                    { required: true, message: '此字段为必填项' },
                                    {
                                        type: 'number', min: 0, max: 100, message: '值无效',
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
                                label='每个作业数量'
                                name='validationFramesPerJobPercent'
                                normalize={(value) => +value}
                                rules={[
                                    { required: true, message: '此字段为必填项' },
                                    {
                                        type: 'number', min: 0, max: 100, message: '值无效',
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
                        label='蜜罐总数'
                        name='validationFramesPercent'
                        normalize={(value) => +value}
                        rules={[
                            { required: true, message: '此字段为必填项' },
                            {
                                type: 'number', min: 0, max: 100, message: '值无效',
                            },
                        ]}
                    >
                        <Input size='large' type='number' min={0} max={100} suffix={<PercentageOutlined />} />
                    </Form.Item>
                </Col>
                <Col span={7} offset={1}>
                    <Form.Item
                        label='每个作业开销'
                        name='validationFramesPerJobPercent'
                        normalize={(value) => +value}
                        rules={[
                            { required: true, message: '此字段为必填项' },
                            {
                                type: 'number', min: 0, max: 100, message: '值无效',
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
                    label='验证模式'
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
                            无
                        </Radio.Button>
                        <Radio.Button value={ValidationMode.GT} key={ValidationMode.GT}>
                            真值
                        </Radio.Button>
                        <Radio.Button value={ValidationMode.HONEYPOTS} key={ValidationMode.HONEYPOTS}>
                            蜜罐
                        </Radio.Button>
                    </Radio.Group>
                </Form.Item>
                { paramsBlock }
            </Form>
        );
    }
}

