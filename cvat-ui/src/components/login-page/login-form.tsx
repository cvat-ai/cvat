// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { FormComponentProps } from 'antd/lib/form/Form';
import {
    Button,
    Icon,
    Input,
    Form,
} from 'antd';

export interface LoginData {
    username: string;
    password: string;
}

type LoginFormProps = {
    fetching: boolean;
    onSubmit(loginData: LoginData): void;
} & FormComponentProps;

class LoginFormComponent extends React.PureComponent<LoginFormProps> {
    private handleSubmit = (e: React.FormEvent): void => {
        e.preventDefault();
        const {
            form,
            onSubmit,
        } = this.props;

        form.validateFields((error, values): void => {
            if (!error) {
                onSubmit(values);
            }
        });
    };

    private renderUsernameField(): JSX.Element {
        const { form } = this.props;
        const { getFieldDecorator } = form;

        return (
            <Form.Item hasFeedback>
                {getFieldDecorator('username', {
                    rules: [{
                        required: true,
                        message: 'Please specify a username',
                    }],
                })(
                    <Input
                        autoComplete='username'
                        prefix={<Icon type='user' style={{ color: 'rgba(0,0,0,.25)' }} />}
                        placeholder='Username'
                    />,
                )}
            </Form.Item>
        );
    }

    private renderPasswordField(): JSX.Element {
        const { form } = this.props;
        const { getFieldDecorator } = form;

        return (
            <Form.Item hasFeedback>
                {getFieldDecorator('password', {
                    rules: [{
                        required: true,
                        message: 'Please specify a password',
                    }],
                })(
                    <Input
                        autoComplete='current-password'
                        prefix={<Icon type='lock' style={{ color: 'rgba(0,0,0,.25)' }} />}
                        placeholder='Password'
                        type='password'
                    />,
                )}
            </Form.Item>
        );
    }

    public render(): JSX.Element {
        const { fetching } = this.props;
        return (
            <Form onSubmit={this.handleSubmit} className='login-form'>
                {this.renderUsernameField()}
                {this.renderPasswordField()}

                <Form.Item>
                    <Button
                        type='primary'
                        loading={fetching}
                        disabled={fetching}
                        htmlType='submit'
                        className='login-form-button'
                    >
                        Sign in
                    </Button>
                </Form.Item>
            </Form>
        );
    }
}

export default Form.create<LoginFormProps>()(LoginFormComponent);
