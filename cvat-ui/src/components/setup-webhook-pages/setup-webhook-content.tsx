// Copyright (C) 2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React, { useEffect, useState } from 'react';
import { Row, Col } from 'antd/lib/grid';
import Form from 'antd/lib/form';
import { Store } from 'antd/lib/form/interface';

import Text from 'antd/lib/typography/Text';
import {
    Button, Checkbox, Input, Radio, Select,
} from 'antd';

export enum WebhookContentType {
    APPLICATION_JSON = 'application/json',
}

export enum EventsMethod {
    SEND_EVERYTHING = 'SEND_EVERYTHING',
    SELECT_INDIVIDUAL = 'SELECT_INDIVIDUAL',
}

export interface SetupWebhookData {
    description: string;
    targetUrl: string;
    contentType: WebhookContentType;
    secret: string;
    enableSsl: boolean;
    active: boolean;
    eventsMethod: EventsMethod;
}

interface Props {
    webhook?: any
}

function SetupWebhookContent(props: Props): JSX.Element {
    const [form] = Form.useForm();
    const { webhook } = props;
    const [showIndividualEvents, setShowIndividualEvents] = useState(false);
    useEffect(() => {
        if (webhook) {
            const maxEvents = 10;
            const eventsMethod = webhook.events.length === maxEvents ?
                EventsMethod.SEND_EVERYTHING :
                EventsMethod.SELECT_INDIVIDUAL;
            setShowIndividualEvents(eventsMethod === EventsMethod.SELECT_INDIVIDUAL);
            const data = {
                description: webhook.description,
                targetUrl: webhook.targetUrl,
                contentType: webhook.contentType,
                secret: webhook.secret,
                enableSsl: webhook.enableSsl,
                active: webhook.active,
                events: webhook.events,
                eventsMethod,
            };
            webhook.events.forEach((event) => {
                data[event.name] = true;
            });
            form.setFieldsValue(data);
        }
    }, [webhook]);

    // TODO: events should be fetched
    const events = [{ id: 1, name: 'event1', description: 'desc1' }, { id: 2, name: 'event2', description: 'desc2' }, { id: 3, name: 'event3', description: 'desc3' }];
    const handleSubmit = (): Promise<void> => form.validateFields()
        .then((values: Store): Promise<void> => Promise.resolve());

    const onEventsMethodChange = (event) => {
        setShowIndividualEvents(event.target.value === EventsMethod.SELECT_INDIVIDUAL);
    };
    return (
        <Row justify='start' align='middle' className='cvat-create-webhook-content'>
            <Col span={24}>
                <Text className='cvat-title'>Create webhook</Text>
            </Col>
            <Col span={24}>
                <Form
                    form={form}
                    layout='vertical'
                    initialValues={{
                        contentType: WebhookContentType.APPLICATION_JSON,
                        eventsMethod: EventsMethod.SEND_EVERYTHING,
                        enableSsl: true,
                        active: true,
                    }}
                >
                    <Form.Item
                        hasFeedback
                        name='description'
                        label={<span>Description</span>}
                        rules={[
                            {
                                required: true,
                                message: 'Webhook description cannot be empty',
                            },
                        ]}
                    >
                        <Input />
                    </Form.Item>
                    <Form.Item
                        hasFeedback
                        name='targetUrl'
                        label={<span>Target URL</span>}
                        rules={[
                            {
                                required: true,
                                message: 'Target URL cannot be empty',
                            },
                        ]}
                    >
                        <Input placeholder='https://example.com/postreceive' />
                    </Form.Item>
                    <Form.Item
                        name='contentType'
                        label={<span>Content type</span>}
                        rules={[
                            {
                                required: true,
                            },
                        ]}
                    >
                        <Select
                            placeholder='Select a option and change input text above'
                        >
                            <Select.Option value={WebhookContentType.APPLICATION_JSON}>
                                {WebhookContentType.APPLICATION_JSON}
                            </Select.Option>
                            {/* <Select.Option value='json'>json</Select.Option> */}
                        </Select>
                    </Form.Item>
                    <Form.Item
                        hasFeedback
                        name='secret'
                        label={<span>Secret</span>}
                    >
                        <Input />
                    </Form.Item>
                    <Form.Item
                        help='Verify SSL certificates when delivering payloads.'
                        name='enableSsl'
                        valuePropName='checked'
                    >
                        <Checkbox>
                            <Text className='cvat-text-color'>Enable SSL</Text>
                        </Checkbox>
                    </Form.Item>
                    <Form.Item
                        help='We will deliver event details when this hook is triggered.'
                        name='active'
                        valuePropName='checked'
                    >
                        <Checkbox>
                            <Text className='cvat-text-color'>Active</Text>
                        </Checkbox>
                    </Form.Item>
                    <Form.Item
                        name='eventsMethod'
                        rules={[
                            {
                                required: true,
                                message: 'The field is required.',
                            },
                        ]}
                    >
                        <Radio.Group onChange={onEventsMethodChange}>
                            <Radio value={EventsMethod.SEND_EVERYTHING} key={EventsMethod.SEND_EVERYTHING}>
                                <Text>Send </Text>
                                <Text strong>everything</Text>
                            </Radio>
                            <Radio value={EventsMethod.SELECT_INDIVIDUAL} key={EventsMethod.SELECT_INDIVIDUAL}>
                                Select individual events
                            </Radio>
                        </Radio.Group>
                    </Form.Item>
                    {
                        showIndividualEvents && (
                            <Row>
                                {events.map((event) => (
                                    <Col span={8} key={event.id}>
                                        <Form.Item
                                            help={event.description}
                                            name={event.name}
                                            valuePropName='checked'
                                        >
                                            <Checkbox>
                                                <Text className='cvat-text-color'>{event.name}</Text>
                                            </Checkbox>
                                        </Form.Item>
                                    </Col>
                                ))}

                            </Row>

                        )
                    }
                </Form>
            </Col>
            <Col span={24}>
                <Row justify='end'>
                    <Col>
                        <Button type='primary' onClick={handleSubmit}>
                            Submit
                        </Button>
                    </Col>
                </Row>
            </Col>
        </Row>

    );
}

export default SetupWebhookContent;
