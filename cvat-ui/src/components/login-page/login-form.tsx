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
    onSubmit(loginData: LoginData): void;
} & FormComponentProps;

class LoginForm extends React.PureComponent<LoginFormProps> {
    constructor(props: LoginFormProps) {
        super(props);
    }

    private handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        this.props.form.validateFields((error, values) => {
            if (!error) {
                this.props.onSubmit(values);
            }
        });
    }

    private renderUsernameField() {
        const { getFieldDecorator } = this.props.form;

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
                        prefix={<Icon type='user' style={{ color: 'rgba(0,0,0,.25)'}} />}
                        placeholder='Username'
                    />
                )}
            </Form.Item>
        )
    }

    private renderPasswordField() {
        const { getFieldDecorator } = this.props.form;

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
                        prefix={<Icon type='lock' style={{ color: 'rgba(0,0,0,.25)'}} />}
                        placeholder='Password'
                        type='password'
                    />
                )}
            </Form.Item>
        )
    }

    public render() {
        return (
            <Form onSubmit={this.handleSubmit.bind(this)} className='login-form'>
                {this.renderUsernameField()}
                {this.renderPasswordField()}

                <Form.Item>
                    <Button type='primary' htmlType='submit' className='login-form-button'>
                        Sign in
                    </Button>
                </Form.Item>
            </Form>
        );
    }
}

export default Form.create<LoginFormProps>()(LoginForm);
