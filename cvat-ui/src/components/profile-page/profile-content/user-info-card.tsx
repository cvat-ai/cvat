// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { isEqual } from 'lodash';
import { CombinedState } from 'reducers';

import Form from 'antd/lib/form';
import Card from 'antd/lib/card';
import { Col, Row } from 'antd/lib/grid';
import Input from 'antd/lib/input';
import Button from 'antd/lib/button';
import Select from 'antd/lib/select';

import { updateUserAsync } from 'actions/auth-actions';
import validationRules from 'utils/validation-rules';

interface ProfileFormValues {
    username?: string;
    email?: string;
    firstName?: string;
    lastName?: string;
    primaryRole?: string;
    customRole?: string;
}

const roleOptions = [
    { value: 'ml_engineer', label: 'ML / computer vision engineer' },
    { value: 'data_scientist', label: 'Data scientist' },
    { value: 'annotation_specialist', label: 'Annotation specialist' },
    { value: 'project_manager', label: 'Project manager' },
    { value: 'founder_executive', label: 'Founder or executive' },
    { value: 'researcher', label: 'Researcher' },
    { value: 'student', label: 'Student' },
    { value: 'educator', label: 'Educator' },
    { value: 'other', label: 'Other' },
];
const predefinedRoles = new Set(roleOptions.map(({ value }) => value).filter((value) => value !== 'other'));

function UserInfoCard(): JSX.Element {
    const user = useSelector((state: CombinedState) => state.auth.user);
    const dispatch = useDispatch();
    const [form] = Form.useForm();
    let initialPrimaryRole: string | undefined;
    if (user?.primaryRole) {
        initialPrimaryRole = predefinedRoles.has(user.primaryRole) ? user.primaryRole : 'other';
    }
    const [primaryRole, setPrimaryRole] = useState<string | undefined>(initialPrimaryRole);

    const initialValues: ProfileFormValues = {
        username: user?.username,
        email: user?.email,
        firstName: user?.firstName,
        lastName: user?.lastName,
        primaryRole: initialPrimaryRole,
        customRole: initialPrimaryRole === 'other' ? user?.primaryRole || undefined : undefined,
    };

    useEffect(() => {
        form.setFieldsValue(initialValues);
        setPrimaryRole(initialPrimaryRole);
    }, [user, form]);

    const onFinish = async (values: ProfileFormValues): Promise<void> => {
        const currentEditableValues = {
            username: values.username,
            firstName: values.firstName,
            lastName: values.lastName,
            primaryRole: values.primaryRole === 'other' ? values.customRole?.trim() : values.primaryRole,
        };
        const initialEditableValues = {
            username: initialValues.username,
            firstName: initialValues.firstName,
            lastName: initialValues.lastName,
            primaryRole: user?.primaryRole || undefined,
        };
        if (user && !isEqual(currentEditableValues, initialEditableValues)) {
            const updatedFields: Parameters<typeof user.save>[0] = {};
            if (values.username !== initialValues.username) {
                updatedFields.username = values.username;
            }
            if (values.firstName !== initialValues.firstName) {
                updatedFields.firstName = values.firstName;
            }
            if (values.lastName !== initialValues.lastName) {
                updatedFields.lastName = values.lastName;
            }
            if (currentEditableValues.primaryRole !== initialEditableValues.primaryRole) {
                updatedFields.primaryRole = currentEditableValues.primaryRole;
            }

            await dispatch(updateUserAsync(user, updatedFields));
        }
    };

    return (
        <Card title='Personal Information' className='cvat-profile-info-card'>
            <Form
                form={form}
                layout='vertical'
                onFinish={onFinish}
                initialValues={initialValues}
            >
                <Row gutter={16}>
                    <Col span={12}>
                        <Form.Item
                            label='First Name'
                            name='firstName'
                            rules={validationRules.firstName}
                        >
                            <Input />
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item
                            label='Last Name'
                            name='lastName'
                            rules={validationRules.lastName}
                        >
                            <Input />
                        </Form.Item>
                    </Col>
                </Row>
                <Form.Item
                    label='Primary role'
                    name='primaryRole'
                >
                    <Select options={roleOptions} onChange={setPrimaryRole} />
                </Form.Item>
                {primaryRole === 'other' && (
                    <Form.Item
                        label='Please specify your role'
                        name='customRole'
                        rules={[
                            { required: true, whitespace: true, message: 'Enter your role' },
                            { max: 255, message: 'The role must not exceed 255 characters' },
                        ]}
                    >
                        <Input />
                    </Form.Item>
                )}
                <Form.Item
                    label='Email'
                    name='email'
                    rules={validationRules.email}
                >
                    <Input disabled />
                </Form.Item>
                <Form.Item
                    label='Username'
                    name='username'
                    rules={validationRules.userName}
                >
                    <Input />
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
    );
}

export default React.memo(UserInfoCard);
