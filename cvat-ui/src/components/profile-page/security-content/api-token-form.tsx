// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import dayjs from 'dayjs';

import Form from 'antd/lib/form';
import Input from 'antd/lib/input';
import DatePicker from 'antd/lib/date-picker';
import Checkbox from 'antd/lib/checkbox';
import Button from 'antd/lib/button';
import { Row, Col } from 'antd/lib/grid';
import Typography from 'antd/lib/typography';

import { ApiTokenModifiableFields, ApiToken } from 'cvat-core-wrapper';

interface Props {
    onSubmit: (data: ApiTokenModifiableFields) => void;
    onCancel: () => void;
    submitting: boolean;
    token: ApiToken | null;
    tokenCount: number;
}

interface FormData {
    name: string;
    expirationDate: dayjs.Dayjs | null;
    isReadOnly: boolean;
}

function ApiTokenForm({
    onSubmit, onCancel, submitting, token, tokenCount,
}: Props): JSX.Element {
    const [form] = Form.useForm<FormData>();
    const isEditing = !!token;

    const handleSubmit = async (): Promise<void> => {
        try {
            const values = await form.validateFields();
            onSubmit({
                name: values.name,
                expiryDate: values.expirationDate ? values.expirationDate.toISOString() : null,
                readOnly: values.isReadOnly,
            });
        } catch (error) {
            // Form validation failed
        }
    };

    const getInitialExpirationDate = (): dayjs.Dayjs | null => {
        if (isEditing) {
            return token?.expiryDate ? dayjs.utc(token.expiryDate).local() : null;
        }
        return dayjs().add(1, 'year');
    };

    const initialValues = {
        name: token?.name || (tokenCount === 0 ? 'New token' : `New token ${tokenCount + 1}`),
        expirationDate: getInitialExpirationDate(),
        isReadOnly: token?.readOnly || false,
    };

    return (
        <Form
            form={form}
            layout='vertical'
            className='cvat-api-token-form'
            initialValues={initialValues}
        >
            <Typography.Title level={5}>
                {isEditing ? '编辑 API 令牌' : '创建 API 令牌'}
            </Typography.Title>
            <Form.Item
                className='cvat-api-token-form-name'
                label='令牌名称'
                name='name'
                rules={[
                    { required: true, message: '请输入令牌名称' },
                    { min: 3, message: '令牌名称至少 3 个字符' },
                    { max: 50, message: '令牌名称不能超过 50 个字符' },
                ]}
            >
                <Input placeholder='输入此令牌的描述性名称' allowClear />
            </Form.Item>
            <Form.Item
                className='cvat-api-token-form-expiration-date'
                label='过期日期'
                name='expirationDate'
                help='如不希望令牌过期，请留空'
            >
                <DatePicker
                    style={{ width: '100%' }}
                    placeholder='选择过期日期'
                    disabledDate={(current) => current && current.valueOf() < Date.now()}
                    format='DD/MM/YYYY'
                />
            </Form.Item>
            <Form.Item
                className='cvat-api-token-form-read-only'
                name='isReadOnly'
                valuePropName='checked'
            >
                <Checkbox>
                    只读
                </Checkbox>
            </Form.Item>
            <Row gutter={8} justify='end'>
                <Col>
                    <Button
                        className='cvat-api-token-form-cancel'
                        onClick={onCancel}
                        disabled={submitting}
                    >
                        取消
                    </Button>
                </Col>
                <Col>
                    <Button
                        className='cvat-api-token-form-submit'
                        type='primary'
                        onClick={handleSubmit}
                        loading={submitting}
                    >
                        {isEditing ? '更新' : '保存'}
                    </Button>
                </Col>
            </Row>
        </Form>
    );
}

export default React.memo(ApiTokenForm);


