// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React, { useState } from 'react';
import Form from 'antd/lib/form';
import Input from 'antd/lib/input';
import Button from 'antd/lib/button';
import Space from 'antd/lib/space';
import { CloseCircleOutlined, EnvironmentOutlined, MailOutlined, PhoneOutlined, PlusOutlined } from '@ant-design/icons';
import Select from 'antd/lib/select';

type ContactType = {
    email: 'Email',
    phone: 'Phone number',
    location: 'Location',
};

function CreateOrganizationForm(): JSX.Element {
    const [form] = Form.useForm();
    const [contactType, setContactType] = useState<keyof ContactType>('email');
    const MAX_SLUG_LEN = 16;
    const MAX_NAME_LEN = 64;

    return (
        <Form form={form} className='cvat-create-organization-form' layout='vertical'>
            <Form.Item
                hasFeedback
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
                hasFeedback
                name='name'
                label='Full name'
                rules={[{ max: MAX_NAME_LEN, message: `Full name must not exceed ${MAX_NAME_LEN} characters` }]}
            >
                <Input />
            </Form.Item>
            <Form.Item hasFeedback name='description' label='Description'>
                <Input />
            </Form.Item>
            <Form.List name='contacts'>
                {
                    (fields, { add, remove }) => (
                        <>
                            { fields.map((field, index) => {
                                const { contactType: _contactType } = form.getFieldValue('contacts')[field.name];
                                let prefix = null;
                                let placeholder = '';
                                if (_contactType === 'email') {
                                    prefix = <MailOutlined />;
                                    placeholder = 'intel@intel.com';
                                } else if (_contactType === 'phone') {
                                    prefix = <PhoneOutlined />;
                                    placeholder = '+14087658080';
                                } else if (_contactType === 'location') {
                                    prefix = <EnvironmentOutlined />;
                                    placeholder = '2200 Mission College Blvd. Santa Clara, CA 95052';
                                }

                                return (
                                    <Space className='cvat-create-organization-form-contact-block'>
                                        <Form.Item
                                            label={index === 0 ? 'Contacts' : ''}
                                            key={field.key}
                                            fieldKey={field.fieldKey}
                                            name={[field.name, 'value']}
                                        >
                                            <Input prefix={prefix} placeholder={placeholder} />
                                        </Form.Item>
                                        <Form.Item>
                                            <CloseCircleOutlined onClick={() => remove(field.name)} />
                                        </Form.Item>
                                    </Space>
                                );
                            })}
                            <Space className='cvat-create-organization-form-add-contact-block'>
                                <Select
                                    value={contactType}
                                    onChange={(value: keyof ContactType) => {
                                        setContactType(value);
                                    }}
                                >
                                    <Select.Option value='email'>Email</Select.Option>
                                    <Select.Option value='phone'>Phone number</Select.Option>
                                    <Select.Option value='location'>Location</Select.Option>
                                </Select>
                                <Form.Item>
                                    <Button
                                        type='dashed'
                                        onClick={() => {
                                            add({ contactType });
                                        }}
                                        block
                                        icon={<PlusOutlined />}
                                    >
                                        Add contact
                                    </Button>
                                </Form.Item>
                            </Space>

                        </>
                    )
                }
            </Form.List>
            {/* <Form.Item name='contacts' label='Contacts'>
                <Input.TextArea placeholder={descriptionTooltip} rows={5} />
            </Form.Item> */}
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

// TODO: Implement cvat-core (several classes and link it with the REST API)
// TODO: Implement Cancel button
// TODO: Implement Submit button
