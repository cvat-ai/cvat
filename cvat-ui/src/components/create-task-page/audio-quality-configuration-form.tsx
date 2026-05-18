// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { RefObject } from 'react';
import Form, { FormInstance } from 'antd/lib/form';
import Radio from 'antd/lib/radio';
import { Col } from 'antd/lib/grid';
import Select from 'antd/lib/select';

import { FrameSelectionMethod } from 'components/create-job-page/job-form';
import { QualityConfiguration, ValidationMode } from './quality-configuration-form';

interface Props {
    initialValues: QualityConfiguration;
    validationMode: ValidationMode;
    onSubmit(values: QualityConfiguration): Promise<void>;
    onChangeFrameSelectionMethod: (method: FrameSelectionMethod) => void;
    onChangeValidationMode: (method: ValidationMode) => void;
}

export default class AudioQualityConfigurationForm extends React.PureComponent<Props> {
    private formRef: RefObject<FormInstance>;

    public constructor(props: Props) {
        super(props);
        this.formRef = React.createRef<FormInstance>();
    }

    public submit(): Promise<void> {
        const { onSubmit } = this.props;
        if (this.formRef.current) {
            return this.formRef.current.validateFields().then((values: QualityConfiguration) => (
                onSubmit({
                    ...values,
                    frameSelectionMethod: values.frameSelectionMethod,
                })
            ));
        }
        return Promise.reject(new Error('Quality form ref is empty'));
    }

    public resetFields(): void {
        this.formRef.current?.resetFields(['frameSelectionMethod']);
    }

    public render(): JSX.Element {
        const {
            initialValues, validationMode, onChangeFrameSelectionMethod, onChangeValidationMode,
        } = this.props;

        const gtParamsBlock = (
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
        );

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
                        onChange={(e) => onChangeValidationMode(e.target.value)}
                    >
                        <Radio.Button value={ValidationMode.NONE} key={ValidationMode.NONE}>
                            None
                        </Radio.Button>
                        <Radio.Button value={ValidationMode.GT} key={ValidationMode.GT}>
                            Ground Truth
                        </Radio.Button>
                    </Radio.Group>
                </Form.Item>
                {validationMode === ValidationMode.GT ? gtParamsBlock : null}
            </Form>
        );
    }
}
