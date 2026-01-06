// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { isEqual } from 'lodash';
import { CombinedState } from 'reducers';

import Form from 'antd/lib/form';
import Card from 'antd/lib/card';
import { Col, Row } from 'antd/lib/grid';
import Input from 'antd/lib/input';
import Button from 'antd/lib/button';

import { updateUserAsync } from 'actions/auth-actions';
import validationRules from 'utils/validation-rules';

interface ProfileFormValues {
    username?: string;
    email?: string;
    firstName?: string;
    lastName?: string;
}

function UserInfoCard(): JSX.Element {
    const user = useSelector((state: CombinedState) => state.auth.user);
    const dispatch = useDispatch();
    const [form] = Form.useForm();

    const initialValues: ProfileFormValues = {
        username: user?.username,
        email: user?.email,
        firstName: user?.firstName,
        lastName: user?.lastName,
    };

    useEffect(() => {
        form.setFieldsValue(initialValues);
    }, [user, form]);

    const onFinish = async (values: ProfileFormValues): Promise<void> => {
        const currentEditableValues = {
            firstName: values.firstName,
            lastName: values.lastName,
        };
        const initialEditableValues = {
            firstName: initialValues.firstName,
            lastName: initialValues.lastName,
        };
        const hasFormChanges = !isEqual(currentEditableValues, initialEditableValues);
        if (user && hasFormChanges) {
            await dispatch(updateUserAsync(user, {
                firstName: values.firstName,
                lastName: values.lastName,
            }));
        }
    };

    return (
        <Card title='个人信息' className='cvat-profile-info-card'>
            <Form
                form={form}
                layout='vertical'
                onFinish={onFinish}
                initialValues={initialValues}
            >
                <Row gutter={16}>
                    <Col span={12}>
                        <Form.Item
                            label='名'
                            name='firstName'
                            rules={validationRules.firstName}
                        >
                            <Input />
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item
                            label='姓'
                            name='lastName'
                            rules={validationRules.lastName}
                        >
                            <Input />
                        </Form.Item>
                    </Col>
                </Row>
                <Form.Item
                    label='邮箱'
                    name='email'
                    rules={validationRules.email}
                >
                    <Input disabled />
                </Form.Item>
                <Form.Item
                    label='用户名'
                    name='username'
                    rules={validationRules.userName}
                >
                    <Input disabled />
                </Form.Item>

                <Form.Item>
                    <Row justify='end'>
                        <Button
                            type='primary'
                            htmlType='submit'
                        >
                            保存更改
                        </Button>
                    </Row>
                </Form.Item>
            </Form>
        </Card>
    );
}

export default React.memo(UserInfoCard);


