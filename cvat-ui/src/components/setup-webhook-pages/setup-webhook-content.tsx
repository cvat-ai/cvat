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
import notification from 'antd/lib/notification';

import { getCore, Webhook } from 'cvat-core-wrapper';
import ProjectSearchField from 'components/create-task-page/project-search-field';
import { useSelector, useDispatch } from 'react-redux';
import { CombinedState } from 'reducers';
import { createWebhookAsync, updateWebhookAsync } from 'actions/webhooks-actions';

export enum WebhookContentType {
    APPLICATION_JSON = 'application/json',
}

export enum WebhookSourceType {
    ORGANIZATION = 'organization',
    PROJECT = 'project',
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
    defaultProjectId: number | null;
}

export function groupEvents(events: string[]): string[] {
    return Array.from(
        new Set(events.map((event: string) => event.split(':')[1])),
    );
}

function collectEvents(method: EventsMethod, submittedGroups: Record<string, any>, allEvents: string[]): string[] {
    return method === EventsMethod.SEND_EVERYTHING ? allEvents : (() => {
        const submittedEvents = Object.entries(submittedGroups).filter(([key, value]) => key.startsWith('event:') && value).map(([key]) => key)
            .map((event: string) => event.split(':')[1]);
        return allEvents.filter((event) => submittedEvents.includes(event.split(':')[1]));
    })();
}

function SetupWebhookContent(props: Props): JSX.Element {
    const dispatch = useDispatch();
    const { webhook, defaultProjectId } = props;
    const [form] = Form.useForm();
    const [rerender, setRerender] = useState(false);
    const [showDetailedEvents, setShowDetailedEvents] = useState(false);
    const [webhookEvents, setWebhookEvents] = useState<string[]>([]);

    const organization = useSelector((state: CombinedState) => state.organizations.current);

    const [projectId, setProjectId] = useState<number | null>(defaultProjectId);

    useEffect(() => {
        const core = getCore();
        if (webhook) {
            core.classes.Webhook.availableEvents(webhook.type).then((events: string[]) => {
                setWebhookEvents(events);
            });
        } else {
            core.classes.Webhook.availableEvents(projectId ?
                WebhookSourceType.PROJECT : WebhookSourceType.ORGANIZATION).then((events: string[]) => {
                setWebhookEvents(events);
            });
        }
    }, [projectId]);

    useEffect(() => {
        if (webhook) {
            const eventsMethod = groupEvents(webhookEvents).length === groupEvents(webhook.events).length ?
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
                data[`event:${event.split(':')[1]}`] = true;
            });

            form.setFieldsValue(data);
            setRerender(!rerender);
        }
    }, [webhook, webhookEvents]);

    const handleSubmit = useCallback(async (): Promise<Webhook | null> => {
        try {
            const values: Store = await form.validateFields();
            let notificationConfig = {
                message: 'Webhook has been successfully updated',
                className: 'cvat-notification-update-webhook-success',
            };
            if (webhook) {
                webhook.description = values.description;
                webhook.targetURL = values.targetURL;
                webhook.secret = values.secret;
                webhook.contentType = values.contentType;
                webhook.isActive = values.isActive;
                webhook.enableSSL = values.enableSSL;
                webhook.events = collectEvents(values.eventsMethod, values, webhookEvents);

                await dispatch(updateWebhookAsync(webhook));
            } else {
                const rawWebhookData = {
                    description: values.description,
                    target_url: values.targetURL,
                    content_type: values.contentType,
                    secret: values.secret,
                    enable_ssl: values.enableSSL,
                    is_active: values.isActive,
                    events: collectEvents(values.eventsMethod, values, webhookEvents),
                    organization_id: projectId ? undefined : organization.id,
                    project_id: projectId,
                    type: projectId ? WebhookSourceType.PROJECT : WebhookSourceType.ORGANIZATION,
                };
                notificationConfig = {
                    message: 'Webhook has been successfully added',
                    className: 'cvat-notification-create-webhook-success',
                };
                await dispatch(createWebhookAsync(rawWebhookData));
            }
            form.resetFields();
            setShowDetailedEvents(false);
            notification.info(notificationConfig);
            return webhook;
        } catch (error) {
            return null;
        }
    }, [webhook, webhookEvents]);

    const onEventsMethodChange = useCallback((event: RadioChangeEvent): void => {
        form.setFieldsValue({ eventsMethod: event.target.value });
        setShowDetailedEvents(event.target.value === EventsMethod.SELECT_INDIVIDUAL);
        setRerender(!rerender);
    }, [rerender]);

    return (
        <Row justify='start' align='middle' className='cvat-setup-webhook-content'>
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
                    {
                        !webhook && (
                            <Row className='ant-form-item'>
                                <Col className='ant-form-item-label' span={24}>
                                    <Text className='cvat-text-color'>Project</Text>
                                </Col>
                                <Col span={24}>
                                    <ProjectSearchField
                                        onSelect={(_projectId: number | null) => setProjectId(_projectId)}
                                        value={projectId}
                                    />
                                </Col>
                            </Row>
                        )
                    }

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
                        <Input />
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
                            <Row className='cvat-webhook-detailed-events'>
                                {groupEvents(webhookEvents).map((event: string, idx: number) => (
                                    <Col span={8} key={idx}>
                                        <Form.Item
                                            name={`event:${event}`}
                                            valuePropName='checked'
                                        >
                                            <Checkbox>
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
                        <Button className='cvat-submit-webhook-button' type='primary' onClick={handleSubmit}>
                            Submit
                        </Button>
                    </Col>
                </Row>
            </Col>
        </Row>

    );
}

export default React.memo(SetupWebhookContent);
