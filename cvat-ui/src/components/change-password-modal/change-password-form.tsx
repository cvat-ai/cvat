// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import Form, { FormComponentProps } from 'antd/lib/form/Form';
import Button from 'antd/lib/button';
import Icon from 'antd/lib/icon';
import Input from 'antd/lib/input';

import patterns from 'utils/validation-patterns';

export interface ChangePasswordData {
    oldPassword: string;
    newPassword1: string;
    newPassword2: string;
}

type ChangePasswordFormProps = {
    fetching: boolean;
    onSubmit(loginData: ChangePasswordData): void;
} & FormComponentProps;

class ChangePasswordFormComponent extends React.PureComponent<ChangePasswordFormProps> {
    private validateConfirmation = (_: any, value: string, callback: Function): void => {
        const { form } = this.props;
        if (value && value !== form.getFieldValue('newPassword1')) {
            callback('Two passwords that you enter is inconsistent!');
        } else {
            callback();
        }
    };

    private validatePassword = (_: any, value: string, callback: Function): void => {
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
            form.validateFields(['newPassword2'], { force: true });
        }
        callback();
    };

    private handleSubmit = (e: React.FormEvent): void => {
        e.preventDefault();
        const { form, onSubmit } = this.props;

        form.validateFields((error, values): void => {
            if (!error) {
                const validatedFields = {
                    ...values,
                    confirmations: [],
                };

                onSubmit(validatedFields);
            }
        });
    };

    private renderOldPasswordField(): JSX.Element {
        const { form } = this.props;

        return (
            <Form.Item hasFeedback>
                {form.getFieldDecorator('oldPassword', {
                    rules: [
                        {
                            required: true,
                            message: 'Please input your current password!',
                        },
                    ],
                })(
                    <Input.Password
                        autoComplete='new-password'
                        prefix={<Icon type='lock' style={{ color: 'rgba(0, 0, 0, 0.25)' }} />}
                        placeholder='Current password'
                    />,
                )}
            </Form.Item>
        );
    }

    private renderNewPasswordField(): JSX.Element {
        const { form } = this.props;

        return (
            <Form.Item hasFeedback>
                {form.getFieldDecorator('newPassword1', {
                    rules: [
                        {
                            required: true,
                            message: 'Please input new password!',
                        },
                        {
                            validator: this.validatePassword,
                        },
                    ],
                })(
                    <Input.Password
                        autoComplete='new-password'
                        prefix={<Icon type='lock' style={{ color: 'rgba(0, 0, 0, 0.25)' }} />}
                        placeholder='New password'
                    />,
                )}
            </Form.Item>
        );
    }

    private renderNewPasswordConfirmationField(): JSX.Element {
        const { form } = this.props;

        return (
            <Form.Item hasFeedback>
                {form.getFieldDecorator('newPassword2', {
                    rules: [
                        {
                            required: true,
                            message: 'Please confirm your new password!',
                        },
                        {
                            validator: this.validateConfirmation,
                        },
                    ],
                })(
                    <Input.Password
                        autoComplete='new-password'
                        prefix={<Icon type='lock' style={{ color: 'rgba(0, 0, 0, 0.25)' }} />}
                        placeholder='Confirm new password'
                    />,
                )}
            </Form.Item>
        );
    }

    public render(): JSX.Element {
        const { fetching } = this.props;

        return (
            <Form onSubmit={this.handleSubmit} className='change-password-form'>
                {this.renderOldPasswordField()}
                {this.renderNewPasswordField()}
                {this.renderNewPasswordConfirmationField()}

                <Form.Item>
                    <Button
                        type='primary'
                        htmlType='submit'
                        className='change-password-form-button'
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

export default Form.create<ChangePasswordFormProps>()(ChangePasswordFormComponent);
