// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) 2022-2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { RefObject } from 'react';
import { Row, Col } from 'antd/lib/grid';
import Input from 'antd/lib/input';
import Form, { FormInstance, RuleObject } from 'antd/lib/form';
import { Store } from 'antd/lib/form/interface';

export interface ConsensusConfiguration {
    consensusJobPerSegment?: number;
}

const initialValues: ConsensusConfiguration = {
    consensusJobPerSegment: 0,
};

interface Props {
    onSubmit(values: ConsensusConfiguration): Promise<void>;
}

const isInteger = ({
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
    if (Number.isNaN(intValue) || !Number.isInteger(intValue)) {
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

    public submit(): Promise<void> {
        const {
            onSubmit,
        } = this.props;

        if (this.formRef.current) {
            return this.formRef.current.validateFields()
                .then(
                    (values: Store): Promise<void> => {
                        const entries = Object.entries(values);
                        return onSubmit({
                            ...((Object.fromEntries(entries) as any) as ConsensusConfiguration),
                        });
                    },
                );
        }

        return Promise.reject(new Error('Form ref is empty'));
    }

    public resetFields(): void {
        if (this.formRef.current) {
            this.formRef.current.resetFields();
        }
    }

    /* eslint-disable class-methods-use-this */
    private renderConsensusJobPerSegment(): JSX.Element {
        return (
            <Form.Item
                label='Consensus Job Per Segment'
                name='consensusJobPerSegment'
                rules={[{
                    validator: isInteger({
                        min: 0,
                        max: 10,
                        toBeSkipped: 1,
                    }),
                }]}
            >
                <Input size='large' type='number' min={0} step={1} />
            </Form.Item>
        );
    }

    public render(): JSX.Element {
        return (
            <Form initialValues={initialValues} ref={this.formRef} layout='vertical'>
                <Row justify='start'>
                    <Col span={12}>
                        {this.renderConsensusJobPerSegment()}
                    </Col>
                </Row>
            </Form>
        );
    }
}

export default ConsensusConfigurationForm;
