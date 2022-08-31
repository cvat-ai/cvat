// Copyright (C) 2022 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';

import React, { useCallback, useEffect, useState } from 'react';
import { Store } from 'antd/lib/form/interface';
import { Row, Col } from 'antd/lib/grid';
import Form from 'antd/lib/form';
import Text from 'antd/lib/typography/Text';
import Button from 'antd/lib/button';
import Checkbox from 'antd/lib/checkbox/Checkbox';
import Input from 'antd/lib/input';
import Radio, { RadioChangeEvent } from 'antd/lib/radio';
import Select from 'antd/lib/select';

import getCore from 'cvat-core-wrapper';
import { notification } from 'antd';
import { useSelector } from 'react-redux';
import { CombinedState } from 'reducers';
import { useHistory } from 'react-router';

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
    enableSSL: boolean;
    active: boolean;
    eventsMethod: EventsMethod;
}

interface Props {
    webhook?: any;
}

export function groupEvents(events: string[]): string[] {
    return Array.from(
        new Set(events.map((event: string) => event.split('_')[0])),
    );
}

function collectEvents(method: EventsMethod, submittedGroups: Record<string, any>, allEvents: string[]): string[] {
    // Temporary disabled all events except job/task
    const temporaryAllEvents = allEvents.filter((event) => event.includes('task') || event.includes('job'));
    return method === EventsMethod.SEND_EVERYTHING ? temporaryAllEvents : (() => {
        const submittedEvents = Object.entries(submittedGroups).filter(([key, value]) => key.startsWith('event_') && value).map(([key]) => key)
            .map((event: string) => event.split('_')[1]);
        return allEvents.filter((event) => submittedEvents.includes(event.split('_')[0]));
    })();
}

function throwError(message: string, error: any): void {
    const stringified = error.toString();
    const MAX_LENGTH = 300;
    if (stringified.length > MAX_LENGTH) {
        console.log(stringified);
    }

    notification.error({
        message,
        description: stringified.length > MAX_LENGTH ? 'Open the browser console to get details' : stringified,
    });
}

function SetupWebhookContent(props: Props): JSX.Element {
    const { webhook } = props;
    const history = useHistory();
    const [form] = Form.useForm();
    const [rerender, setRerender] = useState(false);
    const [showDetailedEvents, setShowDetailedEvents] = useState(false);
    const [webhookEvents, setWebhookEvents] = useState<string[]>([]);
    const organization = useSelector((state: CombinedState) => state.organizations.current);

    useEffect(() => {
        const core = getCore();
        core.classes.Webhook.events().then((events: string[]) => {
            setWebhookEvents(events);
        });
    }, []);

    useEffect(() => {
        if (!organization) {
            // currently available only in an organization
            history.push('/');
        }
    }, [organization]);

    useEffect(() => {
        if (webhook) {
            // Temporary disabled everything except job/task
            const temporaryAllEvents = groupEvents(webhookEvents).filter((event) => ['task', 'job'].includes(event));
            const eventsMethod = temporaryAllEvents.length === groupEvents(webhook.events).length ?
                EventsMethod.SEND_EVERYTHING : EventsMethod.SELECT_INDIVIDUAL;
            setShowDetailedEvents(eventsMethod === EventsMethod.SELECT_INDIVIDUAL);
            const data: Record<string, string | boolean> = {
                description: webhook.description,
                targetURL: webhook.targetURL,
                contentType: webhook.contentType,
                secret: webhook.secret,
                enableSSL: webhook.enableSSL,
                isActive: webhook.isActive,
                events: webhook.events,
                eventsMethod,
            };

            webhook.events.forEach((event: string) => {
                data[`event_${event.split('_')[0]}`] = true;
            });

            form.setFieldsValue(data);
            setRerender(!rerender);
        }
    }, [webhook, webhookEvents]);

    const handleSubmit = useCallback((): void => {
        form.validateFields().then((values: Store): void => {
            if (webhook) {
                webhook.description = values.description;
                webhook.targetURL = values.targetURL;
                webhook.secret = values.secret;
                webhook.contentType = values.contentType;
                webhook.isActive = values.isActive;
                webhook.enableSSL = values.enableSSL;
                webhook.events = collectEvents(values.eventsMethod, values, webhookEvents);

                webhook.save().then(() => {
                    form.resetFields();
                    setShowDetailedEvents(false);
                    notification.info({
                        message: 'Webhook has been successfully updated',
                    });
                }).catch((error: any) => {
                    throwError('Webhook has not been updated', error);
                });
            } else {
                const rawWebhookData = {
                    description: values.description,
                    target_url: values.targetURL,
                    content_type: values.contentType,
                    secret: values.secret,
                    enable_ssl: values.enableSSL,
                    is_active: values.isActive,
                    organization_id: organization.id, // TODO: temporary hardcoded for organizations
                    events: collectEvents(values.eventsMethod, values, webhookEvents),
                };
                const WebhookClass = getCore().classes.Webhook;
                const webhookInstance = new WebhookClass(rawWebhookData);

                webhookInstance.save().then(() => {
                    form.resetFields();
                    notification.info({
                        message: 'Webhook has been successfully added',
                    });
                }).catch((error: any) => {
                    throwError('Webhook has not been created', error);
                });
            }
        });
    }, [webhook, webhookEvents, organization]);

    const onEventsMethodChange = useCallback((event: RadioChangeEvent): void => {
        form.setFieldsValue({ eventsMethod: event.target.value });
        setShowDetailedEvents(event.target.value === EventsMethod.SELECT_INDIVIDUAL);
        setRerender(!rerender);
    }, [rerender]);

    return (
        <Row justify='start' align='middle' className='cvat-create-webhook-content'>
            <Col span={24}>
                <Text className='cvat-title'>Setup a webhook</Text>
            </Col>
            <Col span={24}>
                <Form
                    form={form}
                    layout='vertical'
                    initialValues={{
                        contentType: WebhookContentType.APPLICATION_JSON,
                        eventsMethod: EventsMethod.SEND_EVERYTHING,
                        enableSSL: true,
                        isActive: true,
                    }}
                >
                    <Form.Item
                        hasFeedback
                        name='targetURL'
                        label='Target URL'
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
                        hasFeedback
                        name='description'
                        label='Description'
                    >
                        <Input />
                    </Form.Item>
                    <Form.Item
                        hasFeedback
                        name='contentType'
                        label='Content type'
                        rules={[{ required: true }]}
                    >
                        <Select
                            placeholder='Select an option and change input text above'
                        >
                            <Select.Option value={WebhookContentType.APPLICATION_JSON}>
                                {WebhookContentType.APPLICATION_JSON}
                            </Select.Option>
                        </Select>
                    </Form.Item>
                    <Form.Item
                        name='secret'
                        label='Secret'
                    >
                        <Input disabled />
                    </Form.Item>
                    <Form.Item
                        help='Verify SSL certificates when delivering payloads'
                        name='enableSSL'
                        valuePropName='checked'
                    >
                        <Checkbox>
                            <Text className='cvat-text-color'>Enable SSL</Text>
                        </Checkbox>
                    </Form.Item>
                    <Form.Item
                        help='CVAT will deliver events for active webhooks only'
                        name='isActive'
                        valuePropName='checked'
                    >
                        <Checkbox>
                            <Text className='cvat-text-color'>Active</Text>
                        </Checkbox>
                    </Form.Item>
                    <Form.Item
                        name='eventsMethod'
                        rules={[{
                            required: true,
                            message: 'The field is required',
                        }]}
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
                        showDetailedEvents && (
                            <Row>
                                {groupEvents(webhookEvents).map((event: string, idx: number) => (
                                    <Col span={8} key={idx}>
                                        <Form.Item
                                            name={`event_${event}`}
                                            valuePropName='checked'
                                        >
                                            {/* Temporary disabled everything except job/task */}
                                            <Checkbox disabled={!['job', 'task'].includes(event)}>
                                                <Text className='cvat-text-color'>{event}</Text>
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

export default React.memo(SetupWebhookContent);
