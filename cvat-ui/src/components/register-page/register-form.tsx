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

import patterns from 'utils/validation-patterns';

export interface RegisterData {
    username: string;
    firstName: string;
    lastName: string;
    email: string;
    password1: string;
    password2: string;
}

type RegisterFormProps = {
    fetching: boolean;
    onSubmit(registerData: RegisterData): void;
} & FormComponentProps;

class RegisterFormComponent extends React.PureComponent<RegisterFormProps> {
    private validateConfirmation = (rule: any, value: any, callback: any): void => {
        const { form } = this.props;
        if (value && value !== form.getFieldValue('password1')) {
            callback('Two passwords that you enter is inconsistent!');
        } else {
            callback();
        }
    };

    private validatePassword = (_: any, value: any, callback: any): void => {
        const { form } = this.props;
        if (!patterns.validatePasswordLength.pattern.test(value)) {
            callback(patterns.validatePasswordLength.message);
        }

        if (!patterns.passwordContainsNumericCharacters.pattern.test(value)) {
            callback(patterns.passwordContainsNumericCharacters.message);
        }

        if (!patterns.passwordContainsUpperCaseCharacter.pattern.test(value)) {
            callback(patterns.passwordContainsUpperCaseCharacter.message);
        }

        if (!patterns.passwordContainsLowerCaseCharacter.pattern.test(value)) {
            callback(patterns.passwordContainsLowerCaseCharacter.message);
        }

        if (value) {
            form.validateFields(['password2'], { force: true });
        }
        callback();
    };

    private validateUsername = (_: any, value: any, callback: any): void => {
        if (!patterns.validateUsernameLength.pattern.test(value)) {
            callback(patterns.validateUsernameLength.message);
        }

        if (!patterns.validateUsernameCharacters.pattern.test(value)) {
            callback(patterns.validateUsernameCharacters.message);
        }

        callback();
    };

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

    private renderFirstNameField(): JSX.Element {
        const { form } = this.props;

        return (
            <Form.Item hasFeedback>
                {form.getFieldDecorator('firstName', {
                    rules: [{
                        required: true,
                        message: 'Please specify a first name',
                        pattern: patterns.validateName.pattern,
                    }],
                })(
                    <Input
                        prefix={<Icon type='user-add' style={{ color: 'rgba(0,0,0,.25)' }} />}
                        placeholder='First name'
                    />,
                )}
            </Form.Item>
        );
    }

    private renderLastNameField(): JSX.Element {
        const { form } = this.props;

        return (
            <Form.Item hasFeedback>
                {form.getFieldDecorator('lastName', {
                    rules: [{
                        required: true,
                        message: 'Please specify a last name',
                        pattern: patterns.validateName.pattern,
                    }],
                })(
                    <Input
                        prefix={<Icon type='user-add' style={{ color: 'rgba(0,0,0,.25)' }} />}
                        placeholder='Last name'
                    />,
                )}
            </Form.Item>
        );
    }

    private renderUsernameField(): JSX.Element {
        const { form } = this.props;

        return (
            <Form.Item hasFeedback>
                {form.getFieldDecorator('username', {
                    rules: [{
                        required: true,
                        message: 'Please specify a username',
                    }, {
                        validator: this.validateUsername,
                    }],
                })(
                    <Input
                        prefix={<Icon type='user-add' style={{ color: 'rgba(0,0,0,.25)' }} />}
                        placeholder='Username'
                    />,
                )}
            </Form.Item>
        );
    }

    private renderEmailField(): JSX.Element {
        const { form } = this.props;

        return (
            <Form.Item hasFeedback>
                {form.getFieldDecorator('email', {
                    rules: [{
                        type: 'email',
                        message: 'The input is not valid E-mail!',
                    }, {
                        required: true,
                        message: 'Please specify an email address',
                    }],
                })(
                    <Input
                        autoComplete='email'
                        prefix={<Icon type='mail' style={{ color: 'rgba(0,0,0,.25)' }} />}
                        placeholder='Email address'
                    />,
                )}
            </Form.Item>
        );
    }

    private renderPasswordField(): JSX.Element {
        const { form } = this.props;

        return (
            <Form.Item hasFeedback>
                {form.getFieldDecorator('password1', {
                    rules: [{
                        required: true,
                        message: 'Please input your password!',
                    }, {
                        validator: this.validatePassword,
                    }],
                })(<Input.Password
                    autoComplete='new-password'
                    prefix={<Icon type='lock' style={{ color: 'rgba(0,0,0,.25)' }} />}
                    placeholder='Password'
                />)}
            </Form.Item>
        );
    }

    private renderPasswordConfirmationField(): JSX.Element {
        const { form } = this.props;

        return (
            <Form.Item hasFeedback>
                {form.getFieldDecorator('password2', {
                    rules: [{
                        required: true,
                        message: 'Please confirm your password!',
                    }, {
                        validator: this.validateConfirmation,
                    }],
                })(<Input.Password
                    autoComplete='new-password'
                    prefix={<Icon type='lock' style={{ color: 'rgba(0,0,0,.25)' }} />}
                    placeholder='Confirm password'
                />)}
            </Form.Item>
        );
    }

    public render(): JSX.Element {
        const { fetching } = this.props;

        return (
            <Form onSubmit={this.handleSubmit} className='login-form'>
                {this.renderFirstNameField()}
                {this.renderLastNameField()}
                {this.renderUsernameField()}
                {this.renderEmailField()}
                {this.renderPasswordField()}
                {this.renderPasswordConfirmationField()}

                <Form.Item>
                    <Button
                        type='primary'
                        htmlType='submit'
                        className='register-form-button'
                        loading={fetching}
                        disabled={fetching}
                    >
                        Submit
                    </Button>
                </Form.Item>
            </Form>
        );
    }
}

export default Form.create<RegisterFormProps>()(RegisterFormComponent);
