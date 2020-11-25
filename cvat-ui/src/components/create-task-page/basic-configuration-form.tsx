// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import Input from 'antd/lib/input';
import Form, { FormComponentProps } from 'antd/lib/form/Form';

export interface BaseConfiguration {
    name: string;
}

type Props = FormComponentProps & {
    onSubmit(values: BaseConfiguration): void;
};

class BasicConfigurationForm extends React.PureComponent<Props> {
    public submit(): Promise<void> {
        return new Promise((resolve, reject) => {
            const { form, onSubmit } = this.props;

            form.validateFields((error, values): void => {
                if (!error) {
                    onSubmit({
                        name: values.name,
                    });
                    resolve();
                } else {
                    reject();
                }
            });
        });
    }

    public resetFields(): void {
        const { form } = this.props;
        form.resetFields();
    }

    public render(): JSX.Element {
        const { form } = this.props;
        const { getFieldDecorator } = form;

        return (
            <Form onSubmit={(e: React.FormEvent): void => e.preventDefault()}>
                <Form.Item hasFeedback label={<span>Name</span>}>
                    {getFieldDecorator('name', {
                        rules: [
                            {
                                required: true,
                                message: 'Please, specify a name',
                            },
                        ],
                    })(<Input />)}
                </Form.Item>
            </Form>
        );
    }
}

export default Form.create<Props>()(BasicConfigurationForm);
