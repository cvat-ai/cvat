// Copyright (C) 2022 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT
import React from 'react';
import Form from 'antd/lib/form';
import Input from 'antd/lib/input';

function RoboflowConfiguration(): JSX.Element {
    return (
        <>
            <Form.Item
                name='model_url'
                label='Model URL'
                rules={[{ required: true, message: 'Please, specify model URL' }]}
            >
                <Input />
            </Form.Item>
            <Form.Item
                name='api_key'
                label='API key'
                rules={[{ required: true, message: 'Please, specify API key' }]}
            >
                <Input />
            </Form.Item>
        </>
    );
}

export default React.memo(RoboflowConfiguration);
