// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import Form from 'antd/lib/form';
import Button from 'antd/lib/button';
import Icon from '@ant-design/icons';
import Text from 'antd/lib/typography/Text';
import { BackArrowIcon } from 'icons';
import { Col, Row } from 'antd/lib/grid';
import { Link } from 'react-router-dom';
import Title from 'antd/lib/typography/Title';
import CVATSigningInput from 'components/signing-common/cvat-signing-input';

export interface LoginWithSSOData {
    email: string;
}

interface Props {
    fetching: boolean;
    onSubmit(email: string): void;
}

function LoginWithSSOFormComponent({ fetching, onSubmit }: Props): JSX.Element {
    const [form] = Form.useForm();

    return (
        <div className='cvat-login-with-sso-form-wrapper'>
            <Row justify='space-between' className='cvat-credentials-navigation'>
                <Icon
                    component={() => <Link to='/auth/login'><BackArrowIcon /></Link>}
                />
            </Row>
            <Row>
                <Col>
                    <Title> Login with SSO </Title>
                </Col>
            </Row>
            <Row>
                <Col>
                    <Text type='secondary'>Enter your company email</Text>
                </Col>
            </Row>
            <Form
                form={form}
                className='cvat-login-with-sso-form'
                onFinish={(data: LoginWithSSOData) => {
                    onSubmit(data.email);
                }}
            >
                <Form.Item
                    className='cvat-credentials-form-item'
                    name='email'
                    rules={[
                        {
                            type: 'email',
                            message: 'The input is not valid E-mail!',
                        },
                        {
                            required: true,
                            message: 'Please specify an email address',
                        },
                    ]}
                >
                    <CVATSigningInput
                        autoComplete='email'
                        placeholder='Email'
                        onReset={() => form.setFieldsValue({ email: '' })}
                    />
                </Form.Item>

                <Form.Item>
                    <Button
                        className='cvat-credentials-action-button'
                        loading={fetching}
                        htmlType='submit'
                    >
                        Continue
                    </Button>
                </Form.Item>
            </Form>
        </div>
    );
}

export default React.memo(LoginWithSSOFormComponent);
