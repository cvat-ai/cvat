// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) 2022 CVAT.ai Corp
//
// SPDX-License-Identifier: MIT

import React, { useState } from 'react';
import Form from 'antd/lib/form';
import Button from 'antd/lib/button';
import Icon from '@ant-design/icons';
import Input from 'antd/lib/input';
import Text from 'antd/lib/typography/Text';
import { BackArrowIcon, ClearIcon } from 'icons';
import { Col, Row } from 'antd/lib/grid';
import { Link } from 'react-router-dom';
import Title from 'antd/lib/typography/Title';

export interface ResetPasswordData {
    email: string;
}

interface Props {
    fetching: boolean;
    onSubmit(resetPasswordData: ResetPasswordData): void;
}

function ResetPasswordFormComponent({ fetching, onSubmit }: Props): JSX.Element {
    const [emailNonEmpty, setEmailNonEmpty] = useState(false);
    const [form] = Form.useForm();
    return (
        <div className='cvat-password-reset-form-wrapper'>
            <Row justify='space-between' className='cvat-credentials-navigation'>
                <Icon
                    component={() => <Link to='/auth/login'><BackArrowIcon /></Link>}
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
            <Form form={form} className='cvat-password-reset-form'>
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
                    <Input
                        autoComplete='email'
                        placeholder='enter your email'
                        prefix={
                            <Text>Email</Text>
                        }
                        suffix={(
                            emailNonEmpty ? (
                                <Icon
                                    component={ClearIcon}
                                    onClick={() => {
                                        form.setFieldsValue({ email: '' });
                                    }}
                                />
                            ) : null
                        )}
                        onChange={(event) => {
                            const { value } = event.target;
                            setEmailNonEmpty(!!value);
                        }}
                    />
                </Form.Item>
            </Form>
            <Row>
                <Col className='cvat-password-reset-tip'>
                    <Text> We will send link to your email </Text>
                </Col>
            </Row>
            <Row>
                <Col className='cvat-credentials-link' flex='auto'>
                    <Button
                        className='cvat-credentials-action-button'
                        loading={fetching}
                        onClick={async () => {
                            const resetPasswordData: ResetPasswordData = await form.validateFields();
                            onSubmit(resetPasswordData);
                        }}
                    >
                        Send
                    </Button>
                </Col>
            </Row>
        </div>

    );
}

export default React.memo(ResetPasswordFormComponent);
