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

    private compareToFirstPassword(rule: any, value: any, callback: any) {
        const { form } = this.props;
        if (value && value !== form.getFieldValue('password1')) {
          callback('Two passwords that you enter is inconsistent!');
        } else {
          callback();
        }
      };

    private validateToNextPassword(rule: any, value: any, callback: any) {
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

    private handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        this.props.form.validateFields((error, values) => {
            if (!error) {
                this.props.onSubmit(values);
            }
        });
    }

    render() {
        const { getFieldDecorator } = this.props.form;

        return (
            <Form onSubmit={this.handleSubmit.bind(this)} className='login-form'>
                <Form.Item hasFeedback>
                    {getFieldDecorator('firstName', {
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
                <Form.Item hasFeedback>
                    {getFieldDecorator('lastName', {
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
                <Form.Item hasFeedback>
                    {getFieldDecorator('username', {
                        rules: [{
                            required: true,
                            message: 'Please specify a username',
                            pattern: /^[a-zA-Z0-9_]{5,}$/,
                        }],
                    })(
                        <Input
                            prefix={<Icon type='user-add' style={{ color: 'rgba(0,0,0,.25)'}} />}
                            placeholder='Username'
                        />
                    )}
                </Form.Item>
                <Form.Item hasFeedback>
                    {getFieldDecorator('email', {
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
                <Form.Item hasFeedback>
                    {getFieldDecorator('password1', {
                        rules: [{
                            required: true,
                            message: 'Please input your password!',
                        }, {
                            validator: this.validateToNextPassword.bind(this),
                        }],
                    })(<Input.Password
                        autoComplete='new-password'
                        prefix={<Icon type='lock' style={{ color: 'rgba(0,0,0,.25)'}} />}
                        placeholder='Password'
                    />)}
                </Form.Item>
                <Form.Item hasFeedback>
                    {getFieldDecorator('password2', {
                        rules: [{
                            required: true,
                            message: 'Please confirm your password!',
                        }, {
                            validator: this.compareToFirstPassword.bind(this),
                        }],
                    })(<Input.Password
                        autoComplete='new-password'
                        prefix={<Icon type='lock' style={{ color: 'rgba(0,0,0,.25)'}} />}
                        placeholder='Confirm password'
                    />)}
                </Form.Item>
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