// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import Form from 'antd/lib/form';
import Input from 'antd/lib/input';
import DatePicker from 'antd/lib/date-picker';
import Checkbox from 'antd/lib/checkbox';
import Button from 'antd/lib/button';
import { Row, Col } from 'antd/lib/grid';
import Typography from 'antd/lib/typography';

interface Props {
    onSubmit: (data: {
        label: string;
        expirationDate: string | null;
        readOnly: boolean;
    }) => void;
    onCancel: () => void;
    submitting?: boolean;
}

interface FormData {
    label: string;
    expirationDate: moment.Moment | null;
    isReadOnly: boolean;
}

function CreateApiTokenForm({ onSubmit, onCancel, submitting = false }: Props): JSX.Element {
    const [form] = Form.useForm<FormData>();

    const handleSubmit = async (): Promise<void> => {
        try {
            const values = await form.validateFields();
            onSubmit({
                label: values.label,
                expirationDate: values.expirationDate ? values.expirationDate.toISOString() : null,
                readOnly: values.isReadOnly,
            });
        } catch (error) {
            // Form validation failed
        }
    };

    return (
        <Form
            form={form}
            layout='vertical'
            className='cvat-create-api-token-form'
            initialValues={{
                isReadOnly: false,
            }}
        >
            <Typography.Title level={4}>Create API Token</Typography.Title>
            <Form.Item
                label='Token Name'
                name='label'
                rules={[
                    { required: true, message: 'Please enter a token name' },
                    { min: 3, message: 'Token name must be at least 3 characters' },
                    { max: 50, message: 'Token name must not exceed 50 characters' },
                ]}
            >
                <Input placeholder='Enter a descriptive name for this token' />
            </Form.Item>
            <Form.Item
                label='Expiration Date'
                name='expirationDate'
                help='Leave empty for a token that never expires (not recommended)'
            >
                <DatePicker
                    style={{ width: '100%' }}
                    placeholder='Select expiration date'
                    disabledDate={(current) => current && current.isBefore(new Date(), 'day')}
                />
            </Form.Item>
            <Form.Item
                name='isReadOnly'
                valuePropName='checked'
            >
                <Checkbox>
                    Read-only
                </Checkbox>
            </Form.Item>
            <Row gutter={8} justify='end'>
                <Col>
                    <Button onClick={onCancel} disabled={submitting}>
                        Cancel
                    </Button>
                </Col>
                <Col>
                    <Button
                        type='primary'
                        onClick={handleSubmit}
                        loading={submitting}
                    >
                        Save
                    </Button>
                </Col>
            </Row>
        </Form>
    );
}

export default React.memo(CreateApiTokenForm);
