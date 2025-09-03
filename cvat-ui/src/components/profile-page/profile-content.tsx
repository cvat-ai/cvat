// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { CombinedState } from 'reducers';

import Form from 'antd/lib/form';
import Card from 'antd/lib/card';
import { Col, Row } from 'antd/lib/grid';
import Input from 'antd/lib/input';
import Button from 'antd/lib/button';

import { updateUserAsync } from 'actions/auth-actions';

function ProfileContent(): JSX.Element {
    const user = useSelector((state: CombinedState) => state.auth.user);
    const dispatch = useDispatch();
    const [form] = Form.useForm();
    const [hasChanges, setHasChanges] = useState(false);

    const initialValues = {
        username: user?.username,
        email: user?.email,
        firstName: user?.firstName,
        lastName: user?.lastName,
    };

    useEffect(() => {
        form.setFieldsValue(initialValues);
    }, [user, form]);

    const onValuesChange = (changedValues: any, allValues: any): void => {
        const currentEditableValues = {
            firstName: allValues.firstName,
            lastName: allValues.lastName,
        };
        const initialEditableValues = {
            firstName: initialValues.firstName,
            lastName: initialValues.lastName,
        };

        const hasFormChanges = JSON.stringify(currentEditableValues) !== JSON.stringify(initialEditableValues);
        setHasChanges(hasFormChanges);
    };

    const onFinish = async (values: any): Promise<void> => {
        if (user && hasChanges) {
            await dispatch(updateUserAsync(user, {
                firstName: values.firstName,
                lastName: values.lastName,
            }));
            setHasChanges(false);
        }
    };

    return (
        <div className='cvat-profile-content'>
            <Card title='Personal Information' className='cvat-profile-info-card'>
                <Form
                    form={form}
                    layout='vertical'
                    onFinish={onFinish}
                    onValuesChange={onValuesChange}
                    initialValues={initialValues}
                >
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item
                                label='First Name'
                                name='firstName'
                                rules={[{ required: true, message: 'Please input your first name!' }]}
                            >
                                <Input />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item
                                label='Last Name'
                                name='lastName'
                                rules={[{ required: true, message: 'Please input your last name!' }]}
                            >
                                <Input />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Form.Item
                        label='Email'
                        name='email'
                        rules={[
                            { required: true, message: 'Please input your email!' },
                            { type: 'email', message: 'Please enter a valid email!' },
                        ]}
                    >
                        <Input disabled />
                    </Form.Item>
                    <Form.Item
                        label='Username'
                        name='username'
                        rules={[{ required: true, message: 'Please input your username!' }]}
                    >
                        <Input disabled />
                    </Form.Item>

                    <Form.Item>
                        <Row justify='end'>
                            <Button
                                type='primary'
                                htmlType='submit'
                            >
                                Save changes
                            </Button>
                        </Row>
                    </Form.Item>
                </Form>
            </Card>
        </div>
    );
}

export default React.memo(ProfileContent);
