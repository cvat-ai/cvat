// Copyright (C) 2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { RefObject } from 'react';
import { Row, Col } from 'antd/lib/grid';
import Input from 'antd/lib/input';
import Form, { FormInstance } from 'antd/lib/form';
import { isInteger } from 'utils/validate-integer';

export interface ConsensusConfiguration {
    consensusJobsPerNormalJob: number;
}

const initialValues: ConsensusConfiguration = {
    consensusJobsPerNormalJob: 0,
};

interface Props {
    onChange(values: ConsensusConfiguration): void;
}

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
                        validator: isInteger({
                            min: 0,
                            max: 10,
                            filter: (intValue: number): boolean => intValue !== 1,
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
