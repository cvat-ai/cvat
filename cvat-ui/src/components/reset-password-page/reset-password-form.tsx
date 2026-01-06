// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
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
                    <Title level={2}> 忘记密码？ </Title>
                </Col>
            </Row>
            <Row>
                <Col>
                    <Title level={2}> 让我们创建一个新的 </Title>
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
                            message: '请输入有效的邮箱地址！',
                        },
                        {
                            required: true,
                            message: '请填写邮箱地址',
                        },
                    ]}
                >
                    <CVATSigningInput
                        autoComplete='email'
                        placeholder='邮箱'
                        onReset={() => form.setFieldsValue({ email: '' })}
                    />
                </Form.Item>
                <Row>
                    <Col className='cvat-password-reset-tip'>
                        <Text> 我们将发送链接到您的邮箱 </Text>
                    </Col>
                </Row>
                <Form.Item>
                    <Button
                        className='cvat-credentials-action-button'
                        loading={fetching}
                        htmlType='submit'
                    >
                        发送
                    </Button>
                </Form.Item>
            </Form>
        </div>
    );
}

export default React.memo(ResetPasswordFormComponent);


