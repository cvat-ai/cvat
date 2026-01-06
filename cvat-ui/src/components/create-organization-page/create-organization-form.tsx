// Copyright (C) 2021-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React, { useState } from 'react';
import { useHistory } from 'react-router';
import { useDispatch } from 'react-redux';
import Form from 'antd/lib/form';
import Input from 'antd/lib/input';
import Button from 'antd/lib/button';
import Space from 'antd/lib/space';
import { Store } from 'antd/lib/form/interface';
import { useForm } from 'antd/lib/form/Form';

import { createOrganizationAsync } from 'actions/organization-actions';
import validationPatterns from 'utils/validation-patterns';

function CreateOrganizationForm(): JSX.Element {
    const [form] = useForm<Store>();
    const dispatch = useDispatch();
    const history = useHistory();
    const [creating, setCreating] = useState(false);
    const MAX_SLUG_LEN = 16;
    const MAX_NAME_LEN = 64;

    const onFinish = (values: Store): void => {
        const {
            phoneNumber, location, email, ...rest
        } = values;

        rest.contact = {
            ...(phoneNumber ? { phoneNumber } : {}),
            ...(email ? { email } : {}),
            ...(location ? { location } : {}),
        };

        setCreating(true);
        dispatch(
            createOrganizationAsync(rest, (createdSlug: string): void => {
                localStorage.setItem('currentOrganization', createdSlug);
                (window as Window).location = '/organization';
            }, () => setCreating(false)),
        );
    };

    return (
        <Form
            form={form}
            autoComplete='off'
            onFinish={onFinish}
            className='cvat-create-organization-form'
            layout='vertical'
        >
            <Form.Item
                hasFeedback
                name='slug'
                label='简称'
                rules={[
                    { required: true, message: '简称为必填项' },
                    { max: MAX_SLUG_LEN, message: `简称不能超过 ${MAX_SLUG_LEN} 个字符` },
                    { ...validationPatterns.validateOrganizationSlug },
                ]}
            >
                <Input />
            </Form.Item>
            <Form.Item
                hasFeedback
                name='name'
                label='全称'
                rules={[{ max: MAX_NAME_LEN, message: `全称不能超过 ${MAX_NAME_LEN} 个字符` }]}
            >
                <Input />
            </Form.Item>
            <Form.Item hasFeedback name='description' label='描述'>
                <Input.TextArea rows={3} />
            </Form.Item>
            <Form.Item hasFeedback name='email' label='邮箱' rules={[{ type: 'email', message: '输入的邮箱格式不正确' }]}>
                <Input autoComplete='email' placeholder='support@organization.com' />
            </Form.Item>
            <Form.Item hasFeedback name='phoneNumber' label='电话号码' rules={[{ ...validationPatterns.validatePhoneNumber }]}>
                <Input autoComplete='phoneNumber' placeholder='+44 5555 555555' />
            </Form.Item>
            <Form.Item hasFeedback name='location' label='地址'>
                <Input autoComplete='location' placeholder='国家、省/州、地址、邮编' />
            </Form.Item>
            <Form.Item>
                <Space className='cvat-create-organization-form-buttons-block' align='end'>
                    <Button className='cvat-cancel-new-organization-button' onClick={() => history.goBack()}>取消</Button>
                    <Button className='cvat-submit-new-organization-button' loading={creating} disabled={creating} htmlType='submit' type='primary'>
                        提交
                    </Button>
                </Space>
            </Form.Item>
        </Form>
    );
}

export default React.memo(CreateOrganizationForm);


