// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import Form from 'antd/lib/form';
import Input from 'antd/lib/input';
import Button from 'antd/lib/button';
import Space from 'antd/lib/space';

function CreateOrganizationForm(): JSX.Element {
    const descriptionTooltip = `Preferable format:
    Contact person: <person_name>
    Department: <department>
    Phone: <phone_number>
    Email: <email_address>`;

    const MAX_SLUG_LEN = 16;
    const MAX_NAME_LEN = 64;

    return (
        <Form className='cvat-create-organization-form' layout='vertical'>
            <Form.Item
                name='slug'
                label='Short name'
                rules={[
                    { required: true, message: 'Short name is a required field' },
                    { max: MAX_SLUG_LEN, message: `Short name must not exceed ${MAX_SLUG_LEN} characters` },
                ]}
            >
                <Input />
            </Form.Item>
            <Form.Item
                name='name'
                label='Full name'
                rules={[{ max: MAX_NAME_LEN, message: `Full name must not exceed ${MAX_NAME_LEN} characters` }]}
            >
                <Input />
            </Form.Item>
            <Form.Item name='description' label='Description'>
                <Input />
            </Form.Item>
            <Form.Item name='contacts' label='Contacts'>
                <Input.TextArea placeholder={descriptionTooltip} rows={5} />
            </Form.Item>
            <Form.Item>
                <Space className='cvat-create-organization-form-buttons-block' align='end'>
                    <Button>Cancel</Button>
                    <Button htmlType='submit' type='primary'>
                        Submit
                    </Button>
                </Space>
            </Form.Item>
        </Form>
    );
}

export default React.memo(CreateOrganizationForm);

// TODO: Implement cvat-core
// TODO: Implement Cancel button
// TODO: Implement Submit button
