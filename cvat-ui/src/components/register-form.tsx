import React from 'react';
import { FormComponentProps } from 'antd/lib/form/Form';
import {
    Button,
    Icon,
    Input,
    Form,
} from 'antd';

export interface RegisterData {
    username: string;
    firstName: string;
    lastName: string;
    email: string;
    password1: string;
    password2: string;
}

type RegisterFormProps = {
    onSubmit(registerData: RegisterData): void;
} & FormComponentProps;

class RegisterForm extends React.PureComponent<RegisterFormProps> {
    constructor(props: RegisterFormProps) {
        super(props);
    }

    private validateConfirmation(rule: any, value: any, callback: any) {
        const { form } = this.props;
        if (value && value !== form.getFieldValue('password1')) {
          callback('Two passwords that you enter is inconsistent!');
        } else {
          callback();
        }
      };

    private validatePassword(rule: any, value: any, callback: any) {
        const { form } = this.props;
        if (!/(?=.{8,})/.test(value)) {
            callback('Password must have at least 8 characters');
        }

        if (!/(?=.*[0-9])/.test(value)) {
            callback('Password must have at least 1 numeric characters');
        }

        if (!/(?=.*[A-Z])/.test(value)) {
            callback('Password must have at least 1 uppercase alphabetical character');
        }

        if (!/(?=.*[a-z])/.test(value)) {
            callback('Password must have at least 1 lowercase alphabetical character');
        }

        if (value) {
          form.validateFields(['password2'], { force: true });
        }
        callback();
    };

    private validateUsername(rule: any, value: any, callback: any) {
        if (!/(?=.{5,})/.test(value)) {
            callback('Username must have at least 5 characters');
        }

        if (!/^[a-zA-Z0-9_-]{5,}$/.test(value)) {
            callback('Only characters (a-z), (A-Z), (0-9), -, _ are available');
        }

        callback();
    };

    private handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        this.props.form.validateFields((error, values) => {
            if (!error) {
                this.props.onSubmit(values);
            }
        });
    }

    private renderFirstNameField() {
        return (
            <Form.Item hasFeedback>
                {this.props.form.getFieldDecorator('firstName', {
                    rules: [{
                        required: true,
                        message: 'Please specify a first name',
                        pattern: /^[a-zA-Z]{2,}(([',. -][a-zA-Z ])?[a-zA-Z]*)*$/,
                    }],
                })(
                    <Input
                        prefix={<Icon type='user-add' style={{ color: 'rgba(0,0,0,.25)'}} />}
                        placeholder='First name'
                    />
                )}
            </Form.Item>
        )
    }

    private renderLastNameField() {
        return (
            <Form.Item hasFeedback>
                {this.props.form.getFieldDecorator('lastName', {
                    rules: [{
                        required: true,
                        message: 'Please specify a last name',
                        pattern: /^[a-zA-Z]{2,}(([',. -][a-zA-Z ])?[a-zA-Z]*)*$/,
                    }],
                })(
                    <Input
                        prefix={<Icon type='user-add' style={{ color: 'rgba(0,0,0,.25)'}} />}
                        placeholder='Last name'
                    />
                )}
            </Form.Item>
        )
    }

    private renderUsernameField() {
        return (
            <Form.Item hasFeedback>
                {this.props.form.getFieldDecorator('username', {
                    rules: [{
                        required: true,
                        message: 'Please specify a username',
                    }, {
                        validator: this.validateUsername,
                    }],
                })(
                    <Input
                        prefix={<Icon type='user-add' style={{ color: 'rgba(0,0,0,.25)'}} />}
                        placeholder='Username'
                    />
                )}
            </Form.Item>
        )
    }

    private renderEmailField() {
        return (
            <Form.Item hasFeedback>
                {this.props.form.getFieldDecorator('email', {
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
                        prefix={<Icon type='mail' style={{ color: 'rgba(0,0,0,.25)'}} />}
                        placeholder='Email address'
                    />
                )}
            </Form.Item>
        )
    }

    private renderPasswordField() {
        return (
            <Form.Item hasFeedback>
                {this.props.form.getFieldDecorator('password1', {
                    rules: [{
                        required: true,
                        message: 'Please input your password!',
                    }, {
                        validator: this.validatePassword.bind(this),
                    }],
                })(<Input.Password
                    autoComplete='new-password'
                    prefix={<Icon type='lock' style={{ color: 'rgba(0,0,0,.25)'}} />}
                    placeholder='Password'
                />)}
            </Form.Item>
        )
    }

    private renderPasswordConfirmationField() {
        return (
            <Form.Item hasFeedback>
                {this.props.form.getFieldDecorator('password2', {
                    rules: [{
                        required: true,
                        message: 'Please confirm your password!',
                    }, {
                        validator: this.validateConfirmation.bind(this),
                    }],
                })(<Input.Password
                    autoComplete='new-password'
                    prefix={<Icon type='lock' style={{ color: 'rgba(0,0,0,.25)'}} />}
                    placeholder='Confirm password'
                />)}
            </Form.Item>
        )
    }



    public render() {
        return (
            <Form onSubmit={this.handleSubmit.bind(this)} className='login-form'>
                {this.renderFirstNameField()}
                {this.renderLastNameField()}
                {this.renderUsernameField()}
                {this.renderEmailField()}
                {this.renderPasswordField()}
                {this.renderPasswordConfirmationField()}

                <Form.Item>
                    <Button type='primary' htmlType='submit' className='register-form-button'>
                        Submit
                    </Button>
                </Form.Item>
            </Form>
        );
    }
}

export default Form.create<RegisterFormProps>()(RegisterForm);