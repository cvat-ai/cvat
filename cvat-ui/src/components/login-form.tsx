import React from 'react';
import Text from 'antd/lib/typography/Text';
import { FormComponentProps } from 'antd/lib/form/Form';
import {
    Button,
    Icon,
    Input,
    Form,
    Row,
    Col
} from 'antd';

interface LoginFormProps {
    onSubmit(login: string, password: string): void;
}

class LoginForm extends React.PureComponent<FormComponentProps & LoginFormProps> {
    constructor(props: FormComponentProps & LoginFormProps) {
        super(props);
    }

    private handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        this.props.form.validateFields((error, values) => {
            if (!error) {
                this.props.onSubmit(values.username, values.password);
            }
        });
    }

    public render() {
        const { getFieldDecorator } = this.props.form;

        return (
            <Form onSubmit={this.handleSubmit.bind(this)} className='login-form'>
                <Form.Item>
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
                <Form.Item>
                    {getFieldDecorator('password', {
                        rules: [{
                            required: true,
                            message: 'Please specify a password',
                        }],
                    })(
                        <Input
                            autoComplete='current-password'
                            prefix={<Icon type='user' style={{ color: 'rgba(0,0,0,.25)'}} />}
                            placeholder='Password'
                            type='password'
                        />
                    )}
                </Form.Item>
                <Form.Item>
                    <Row type='flex' justify='start' align='middle'>
                        <Col>
                            <Button type='primary' htmlType='submit' className='login-form-button'>
                                Sign in
                            </Button>
                        </Col>
                    </Row>
                </Form.Item>
            </Form>
        );
    }
}

export default Form.create<FormComponentProps & LoginFormProps>()(LoginForm);
