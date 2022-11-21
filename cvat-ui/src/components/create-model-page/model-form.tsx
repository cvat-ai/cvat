// Copyright (C) 2022 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';

import React, { useCallback, useState } from 'react';
import { Store } from 'antd/lib/form/interface';
import { Row, Col } from 'antd/lib/grid';
import Form from 'antd/lib/form';
import Button from 'antd/lib/button';
import Select from 'antd/lib/select';

import { ModelsProviderType } from 'utils/enums';
import RoboflowConfiguration from './providers/roboflow-configuration';
import { useHistory } from 'react-router';

const modelProviders = {
    [ModelsProviderType.ROBOFLOW]: <RoboflowConfiguration />,
};

function ModelForm(): JSX.Element {
    const [form] = Form.useForm();
    const history = useHistory();
    const [currentProvider, setCurrentProvider] = useState<JSX.Element | null>(null);
    const onChangeProviderValue = useCallback((provider: ModelsProviderType) => {
        setCurrentProvider(modelProviders[provider]);
    }, []);

    const handleSubmit = useCallback(async (): Promise<void> => {
        try {
            const values: Store = await form.validateFields();
            const notificationConfig = {
                message: 'Webhook has been successfully updated',
                className: 'cvat-notification-update-webhook-success',
            };
            console.log(values);
        } catch (e) {
            console.log(e);
        }
    }, []);

    return (
        <Row className='cvat-create-model-form-wrapper'>
            <Col span={24}>
                <Form
                    form={form}
                    layout='vertical'
                >
                    <Form.Item
                        label='Provider'
                        name='provider_type'
                        rules={[{ required: true, message: 'Please, specify model provider' }]}
                    >
                        <Select
                            virtual={false}
                            onChange={onChangeProviderValue}
                            className='cvat-select-model-provider'
                        >
                            <Select.Option value={ModelsProviderType.ROBOFLOW}>
                                <span className='cvat-cloud-storage-select-provider'>
                                    Roboflow
                                </span>
                            </Select.Option>
                        </Select>
                    </Form.Item>
                    <Col offset={1}>
                        {currentProvider}
                    </Col>
                </Form>
            </Col>
            <Col span={24}>
                <Row justify='end'>
                    <Col>
                        <Button onClick={() => history.goBack()}>
                            Cancel
                        </Button>
                    </Col>
                    <Col offset={1}>
                        <Button type='primary' onClick={handleSubmit}>
                            Submit
                        </Button>
                    </Col>
                </Row>
            </Col>
        </Row>
    );
}

export default React.memo(ModelForm);
