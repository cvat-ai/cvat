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
    visibleSections?: QualityConfigurationSection[];
}

export enum ValidationMode {
    NONE = 'none',
    GT = 'gt',
    HONEYPOTS = 'gt_pool',
}

export enum QualityConfigurationSection {
    VALIDATION_MODE = 'validationMode',
    FRAME_SELECTION = 'frameSelection',
    VALIDATION_QUANTITY = 'validationQuantity',
    HONEYPOTS = 'honeypots',
}

export const CV_QUALITY_CONFIGURATION_SECTIONS = [
    QualityConfigurationSection.VALIDATION_MODE,
    QualityConfigurationSection.FRAME_SELECTION,
    QualityConfigurationSection.VALIDATION_QUANTITY,
    QualityConfigurationSection.HONEYPOTS,
];

export const AUDIO_QUALITY_CONFIGURATION_SECTIONS = [
    QualityConfigurationSection.VALIDATION_MODE,
];

export default class QualityConfigurationForm extends React.PureComponent<Props> {
    private formRef: RefObject<FormInstance>;

    public constructor(props: Props) {
        super(props);
        this.formRef = React.createRef<FormInstance>();
    }

    private hasSection(section: QualityConfigurationSection): boolean {
        const { visibleSections = CV_QUALITY_CONFIGURATION_SECTIONS } = this.props;
        return visibleSections.includes(section);
    }

    public submit(): Promise<void> {
        const { onSubmit } = this.props;
        const supportsFrameSelection = this.hasSection(QualityConfigurationSection.FRAME_SELECTION);
        const supportsValidationQuantity = this.hasSection(QualityConfigurationSection.VALIDATION_QUANTITY);
        const supportsHoneypots = this.hasSection(QualityConfigurationSection.HONEYPOTS);

        if (this.formRef.current) {
            return this.formRef.current.validateFields().then((values: QualityConfiguration) => (
                onSubmit({
                    ...values,
                    ...(supportsFrameSelection ? {
                        frameSelectionMethod: supportsHoneypots && values.validationMode === ValidationMode.HONEYPOTS ?
                            FrameSelectionMethod.RANDOM : values.frameSelectionMethod,
                    } : {}),
                    ...(supportsValidationQuantity && typeof values.validationFramesPercent === 'number' ? {
                        validationFramesPercent: values.validationFramesPercent / 100,
                    } : {}),
                    ...(supportsValidationQuantity && typeof values.validationFramesPerJobPercent === 'number' ? {
                        validationFramesPerJobPercent: values.validationFramesPerJobPercent / 100,
                    } : {}),
                })
            ));
        }

        return Promise.reject(new Error('Quality form ref is empty'));
    }

    public resetFields(): void {
        const supportsFrameSelection = this.hasSection(QualityConfigurationSection.FRAME_SELECTION);
        const supportsValidationQuantity = this.hasSection(QualityConfigurationSection.VALIDATION_QUANTITY);
        const fields = [
            ...(supportsValidationQuantity ? ['validationFramesPercent', 'validationFramesPerJobPercent'] : []),
            ...(supportsFrameSelection ? ['frameSelectionMethod'] : []),
        ];

        this.formRef.current?.resetFields(
            fields,
        );
    }

    private gtParamsBlock(): JSX.Element {
        const { frameSelectionMethod, onChangeFrameSelectionMethod } = this.props;
        const supportsFrameSelection = this.hasSection(QualityConfigurationSection.FRAME_SELECTION);
        const supportsValidationQuantity = this.hasSection(QualityConfigurationSection.VALIDATION_QUANTITY);

        return (
            <>
                {supportsFrameSelection && (
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
                                <Select.Option value={FrameSelectionMethod.RANDOM_PER_JOB}>
                                    Random per job
                                </Select.Option>
                            </Select>
                        </Form.Item>
                    </Col>
                )}

                {
                    supportsValidationQuantity && frameSelectionMethod === FrameSelectionMethod.RANDOM && (
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
                    supportsValidationQuantity && frameSelectionMethod === FrameSelectionMethod.RANDOM_PER_JOB && (
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
        const {
            initialValues, validationMode, onChangeValidationMode,
        } = this.props;
        const supportsHoneypots = this.hasSection(QualityConfigurationSection.HONEYPOTS);

        let paramsBlock: JSX.Element | null = null;
        if (validationMode === ValidationMode.GT) {
            paramsBlock = this.gtParamsBlock();
        } else if (supportsHoneypots && validationMode === ValidationMode.HONEYPOTS) {
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
                        {supportsHoneypots && (
                            <Radio.Button value={ValidationMode.HONEYPOTS} key={ValidationMode.HONEYPOTS}>
                                Honeypots
                            </Radio.Button>
                        )}
                    </Radio.Group>
                </Form.Item>
                { paramsBlock }
            </Form>
        );
    }
}
