// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import Form, { FormComponentProps } from 'antd/lib/form/Form';
import Button from 'antd/lib/button';
import Icon from 'antd/lib/icon';
import Input from 'antd/lib/input';

export interface ResetPasswordData {
    email: string;
}

type ResetPasswordFormProps = {
    fetching: boolean;
    onSubmit(resetPasswordData: ResetPasswordData): void;
} & FormComponentProps;

class ResetPasswordFormComponent extends React.PureComponent<ResetPasswordFormProps> {
    private handleSubmit = (e: React.FormEvent): void => {
        e.preventDefault();
        const { form, onSubmit } = this.props;

        form.validateFields((error, values): void => {
            if (!error) {
                onSubmit(values);
            }
        });
    };

    private renderEmailField(): JSX.Element {
        const { form } = this.props;

        return (
            <Form.Item hasFeedback>
                {form.getFieldDecorator('email', {
                    rules: [
                        {
                            type: 'email',
                            message: 'The input is not valid E-mail!',
                        },
                        {
                            required: true,
                            message: 'Please specify an email address',
                        },
                    ],
                })(
                    <Input
                        autoComplete='email'
                        prefix={<Icon type='mail' style={{ color: 'rgba(0, 0, 0, 0.25)' }} />}
                        placeholder='Email address'
                    />,
                )}
            </Form.Item>
        );
    }

    public render(): JSX.Element {
        const { fetching } = this.props;
        return (
            <Form onSubmit={this.handleSubmit} className='cvat-reset-password-form'>
                {this.renderEmailField()}

                <Form.Item>
                    <Button
                        type='primary'
                        loading={fetching}
                        disabled={fetching}
                        htmlType='submit'
                        className='cvat-reset-password-form-button'
                    >
                        Reset password
                    </Button>
                </Form.Item>
            </Form>
        );
    }
}

export default Form.create<ResetPasswordFormProps>()(ResetPasswordFormComponent);
