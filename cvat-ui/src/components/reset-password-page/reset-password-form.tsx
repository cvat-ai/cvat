// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) 2022 CVAT.ai Corp
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
import { useAuthQuery } from 'utils/hooks';

export interface ResetPasswordData {
    email: string;
}

interface Props {
    fetching: boolean;
    onSubmit(resetPasswordData: ResetPasswordData): void;
}

function ResetPasswordFormComponent({ fetching, onSubmit }: Props): JSX.Element {
    const [form] = Form.useForm();
    const authQuery = useAuthQuery();
    const defaultCredential = authQuery?.email;
    return (
        <div className='cvat-password-reset-form-wrapper'>
            <Row justify='space-between' className='cvat-credentials-navigation'>
                <Icon
                    component={() => (
                        <Link to={{
                            pathname: '/auth/login',
                            search: authQuery ? new URLSearchParams(authQuery).toString() : '',
                        }}
                        >
                            <BackArrowIcon />
                        </Link>
                    )}
                />
            </Row>
            <Row>
                <Col>
                    <Title level={2}> Forgot password? </Title>
                </Col>
            </Row>
            <Row>
                <Col>
                    <Title level={2}> Let&apos;s create a new one </Title>
                </Col>
            </Row>
            <Form
                form={form}
                className='cvat-password-reset-form'
                initialValues={{
                    email: defaultCredential,
                }}
                onFinish={(resetPasswordData: ResetPasswordData) => {
                    onSubmit(resetPasswordData);
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
                <Row>
                    <Col className='cvat-password-reset-tip'>
                        <Text> We will send link to your email </Text>
                    </Col>
                </Row>
                <Form.Item>
                    <Button
                        className='cvat-credentials-action-button'
                        loading={fetching}
                        htmlType='submit'
                    >
                        Send
                    </Button>
                </Form.Item>
            </Form>
        </div>
    );
}

export default React.memo(ResetPasswordFormComponent);
