// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { withRouter, RouteComponentProps } from 'react-router-dom';
import Form, { FormComponentProps } from 'antd/lib/form/Form';
import Button from 'antd/lib/button';
import Icon from 'antd/lib/icon';
import Input from 'antd/lib/input';

import patterns from 'utils/validation-patterns';

export interface ResetPasswordConfirmData {
    newPassword1: string;
    newPassword2: string;
    uid: string;
    token: string;
}

type ResetPasswordConfirmFormProps = {
    fetching: boolean;
    onSubmit(resetPasswordConfirmData: ResetPasswordConfirmData): void;
} & FormComponentProps &
    RouteComponentProps;

class ResetPasswordConfirmFormComponent extends React.PureComponent<ResetPasswordConfirmFormProps> {
    private validateConfirmation = (_: any, value: string, callback: Function): void => {
        const { form } = this.props;
        if (value && value !== form.getFieldValue('newPassword1')) {
            callback('Passwords do not match!');
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
        const { form, onSubmit, location } = this.props;

        const params = new URLSearchParams(location.search);
        const uid = params.get('uid');
        const token = params.get('token');

        form.validateFields((error, values): void => {
            if (!error) {
                const validatedFields = {
                    ...values,
                    uid,
                    token,
                };

                onSubmit(validatedFields);
            }
        });
    };

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
            <Form onSubmit={this.handleSubmit} className='cvat-reset-password-confirm-form'>
                {this.renderNewPasswordField()}
                {this.renderNewPasswordConfirmationField()}

                <Form.Item>
                    <Button
                        type='primary'
                        htmlType='submit'
                        className='cvat-reset-password-confirm-form-button'
                        loading={fetching}
                        disabled={fetching}
                    >
                        Change password
                    </Button>
                </Form.Item>
            </Form>
        );
    }
}

export default withRouter(Form.create<ResetPasswordConfirmFormProps>()(ResetPasswordConfirmFormComponent));
