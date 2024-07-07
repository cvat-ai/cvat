// Copyright (C) 2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { RefObject } from 'react';
import { Row, Col } from 'antd/lib/grid';
import Input from 'antd/lib/input';
import Form, { FormInstance, RuleObject } from 'antd/lib/form';

export interface ConsensusConfiguration {
    consensusJobsPerNormalJob: number;
}

const initialValues: ConsensusConfiguration = {
    consensusJobsPerNormalJob: 0,
};

interface Props {
    onChange(values: ConsensusConfiguration): void;
}

const isNumber = ({
    min,
    max,
    toBeSkipped,
}: { min?: number; max?: number; toBeSkipped?: number }) => (
    _: RuleObject,
    value?: number | string,
): Promise<void> => {
    if (typeof value === 'undefined' || value === '') {
        return Promise.resolve();
    }

    const intValue = +value;
    if (!Number.isFinite(intValue) && !Number.isInteger(intValue)) {
        return Promise.reject(new Error('Value must be a positive integer'));
    }

    if (typeof min !== 'undefined' && intValue < min) {
        return Promise.reject(new Error(`Value must be more than ${min}`));
    }

    if (typeof max !== 'undefined' && intValue > max) {
        return Promise.reject(new Error(`Value must be less than ${max}`));
    }

    if (typeof toBeSkipped !== 'undefined' && intValue === toBeSkipped) {
        return Promise.reject(new Error(`Value shouldn't be equal to ${toBeSkipped}`));
    }

    return Promise.resolve();
};

class ConsensusConfigurationForm extends React.PureComponent<Props> {
    private formRef: RefObject<FormInstance>;

    public constructor(props: Props) {
        super(props);
        this.formRef = React.createRef<FormInstance>();
    }

    private handleChangeName(e: React.ChangeEvent<HTMLInputElement>): void {
        const { onChange } = this.props;
        onChange({
            consensusJobsPerNormalJob: parseInt(e.target.value, 10),
        });
    }

    public submit(): Promise<void> {
        if (this.formRef.current) {
            return this.formRef.current.validateFields();
        }

        return Promise.reject(new Error('Form ref is empty'));
    }

    public resetFields(): void {
        if (this.formRef.current) {
            this.formRef.current.resetFields();
        }
    }

    /* eslint-disable class-methods-use-this */
    private renderconsensusJobsPerNormalJob(): JSX.Element {
        return (
            <Form.Item
                label='Consensus Jobs Per Normal Job'
                name='consensusJobsPerNormalJob'
                rules={[
                    {
                        validator: isNumber({
                            min: 0,
                            max: 10,
                            toBeSkipped: 1,
                        }),
                    },
                ]}
            >
                <Input
                    size='large'
                    type='number'
                    min={0}
                    step={1}
                    onChange={(e) => this.handleChangeName(e)}
                />
            </Form.Item>
        );
    }

    public render(): JSX.Element {
        return (
            <Form initialValues={initialValues} ref={this.formRef} layout='vertical'>
                <Row justify='start'>
                    <Col span={24}>
                        {this.renderconsensusJobsPerNormalJob()}
                    </Col>
                </Row>
            </Form>
        );
    }
}

export default ConsensusConfigurationForm;
