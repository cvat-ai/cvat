// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useState, useRef, useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import moment from 'moment';
import { Row, Col } from 'antd/lib/grid';
import Text from 'antd/lib/typography/Text';
import Paragraph from 'antd/lib/typography/Paragraph';
import Modal from 'antd/lib/modal';
import Button from 'antd/lib/button';
import Space from 'antd/lib/space';
import Input from 'antd/lib/input';
import Form from 'antd/lib/form';
import Select from 'antd/lib/select';
import Popover from 'antd/lib/popover';
import { useForm } from 'antd/lib/form/Form';
import { Store } from 'antd/lib/form/interface';

import {
    EditTwoTone, EnvironmentOutlined,
    MailOutlined, PhoneOutlined, PlusCircleOutlined, DeleteOutlined, MoreOutlined,
} from '@ant-design/icons';

import {
    inviteOrganizationMembersAsync,
    leaveOrganizationAsync,
    removeOrganizationAsync,
    updateOrganizationAsync,
} from 'actions/organization-actions';
import Menu from 'components/dropdown-menu';

export interface Props {
    organizationInstance: any;
    userInstance: any;
    fetchMembers: () => void;
}

export enum MenuActions {
    SET_WEBHOOKS = 'SET_WEBHOOKS',
    REMOVE_ORGANIZATION = 'REMOVE_ORGANIZATION',
}

function OrganizationTopBar(props: Props): JSX.Element {
    const { organizationInstance, userInstance, fetchMembers } = props;
    const {
        owner, createdDate, description, updatedDate, slug, name, contact,
    } = organizationInstance;
    const { id: userID } = userInstance;
    const [form] = useForm();
    const descriptionEditingRef = useRef<HTMLDivElement>(null);
    const [visibleInviteModal, setVisibleInviteModal] = useState<boolean>(false);
    const [editingDescription, setEditingDescription] = useState<boolean>(false);
    const dispatch = useDispatch();

    useEffect(() => {
        const listener = (event: MouseEvent): void => {
            const divElement = descriptionEditingRef.current;
            if (editingDescription && divElement && !event.composedPath().includes(divElement)) {
                setEditingDescription(false);
            }
        };

        window.addEventListener('mousedown', listener);
        return () => {
            window.removeEventListener('mousedown', listener);
        };
    });

    const onRemove = (): void => {
        const modal = Modal.confirm({
            onOk: () => {
                dispatch(removeOrganizationAsync(organizationInstance));
            },
            content: (
                <div className='cvat-remove-organization-submit'>
                    <Text type='warning'>
                        To remove the organization,
                        enter its short name below
                    </Text>
                    <Input
                        onChange={
                            (event: React.ChangeEvent<HTMLInputElement>) => {
                                modal.update({
                                    okButtonProps: {
                                        disabled: event.target.value !== organizationInstance.slug,
                                        danger: true,
                                    },
                                });
                            }
                        }
                    />
                </div>
            ),
            okButtonProps: {
                disabled: true,
                danger: true,
            },
            okText: 'Remove',
        });
    };

    let organizationName = name;
    let organizationDescription = description;
    let organizationContacts = contact;
    const history = useHistory();

    return (
        <>
            <Row justify='space-between'>
                <Col span={24}>
                    <div className='cvat-organization-top-bar-descriptions'>
                        <Row justify='space-between'>
                            <Col>
                                <Text>
                                    <Text className='cvat-title'>{`Organization: ${slug} `}</Text>
                                </Text>
                            </Col>
                            <Col>
                                <Popover
                                    trigger={['click']}
                                    destroyTooltipOnHide
                                    overlayInnerStyle={{ padding: 0 }}
                                    content={() => (
                                        <Menu className='cvat-organization-actions-menu'>
                                            <Menu.Item key={MenuActions.SET_WEBHOOKS}>
                                                <a
                                                    href='/organization/webhooks'
                                                    onClick={(e: React.MouseEvent) => {
                                                        e.preventDefault();
                                                        history.push({
                                                            pathname: '/organization/webhooks',
                                                        });
                                                        return false;
                                                    }}
                                                >
                                                    Setup webhooks
                                                </a>
                                            </Menu.Item>
                                            {owner && userID === owner.id ? (
                                                <Menu.Item
                                                    key={MenuActions.REMOVE_ORGANIZATION}
                                                    onClick={onRemove}
                                                >
                                                    Remove organization
                                                </Menu.Item>
                                            ) : null}
                                        </Menu>
                                    )}
                                >
                                    <Button size='middle' className='cvat-organization-page-actions-button'>
                                        <Text className='cvat-text-color'>Actions</Text>
                                        <MoreOutlined className='cvat-menu-icon' />
                                    </Button>
                                </Popover>
                            </Col>

                        </Row>

                        <Text
                            editable={{
                                onChange: (value: string) => {
                                    organizationName = value;
                                },
                                onEnd: () => {
                                    organizationInstance.name = organizationName;
                                    dispatch(updateOrganizationAsync(organizationInstance));
                                },
                            }}
                            type='secondary'
                        >
                            {name}
                        </Text>
                        {!editingDescription ? (
                            <span style={{ display: 'grid' }}>
                                {(description || 'Add description').split('\n').map((val: string, idx: number) => (
                                    <Text key={idx} type='secondary'>
                                        {val}
                                        {idx === 0 ? <EditTwoTone onClick={() => setEditingDescription(true)} /> : null}
                                    </Text>
                                ))}
                            </span>
                        ) : (
                            <div ref={descriptionEditingRef}>
                                <Input.TextArea
                                    defaultValue={description}
                                    onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => {
                                        organizationDescription = event.target.value;
                                    }}
                                />
                                <Button
                                    className='cvat-submit-new-org-description-button'
                                    size='small'
                                    type='primary'
                                    onClick={() => {
                                        if (organizationDescription !== description) {
                                            organizationInstance.description = organizationDescription;
                                            dispatch(updateOrganizationAsync(organizationInstance));
                                        }
                                        setEditingDescription(false);
                                    }}
                                >
                                    Submit
                                </Button>
                            </div>
                        )}
                    </div>
                </Col>
                <Col span={12}>
                    <div className='cvat-organization-top-bar-contacts'>
                        <div>
                            <PhoneOutlined />
                            { !contact.phoneNumber ? <Text type='secondary'>Add phone number</Text> : null }
                            <Text
                                type='secondary'
                                editable={{
                                    onChange: (value: string) => {
                                        organizationContacts = {
                                            ...organizationInstance.contact, phoneNumber: value,
                                        };
                                    },
                                    onEnd: () => {
                                        organizationInstance.contact = organizationContacts;
                                        dispatch(updateOrganizationAsync(organizationInstance));
                                    },
                                }}
                            >
                                {contact.phoneNumber}
                            </Text>
                        </div>
                        <div>
                            <MailOutlined />
                            { !contact.email ? <Text type='secondary'>Add email</Text> : null }
                            <Text
                                type='secondary'
                                editable={{
                                    onChange: (value: string) => {
                                        organizationContacts = {
                                            ...organizationInstance.contact, email: value,
                                        };
                                    },
                                    onEnd: () => {
                                        organizationInstance.contact = organizationContacts;
                                        dispatch(updateOrganizationAsync(organizationInstance));
                                    },
                                }}
                            >
                                {contact.email}
                            </Text>
                        </div>
                        <div>
                            <EnvironmentOutlined />
                            { !contact.location ? <Text type='secondary'>Add location</Text> : null }
                            <Text
                                type='secondary'
                                editable={{
                                    onChange: (value: string) => {
                                        organizationContacts = {
                                            ...organizationInstance.contact, location: value,
                                        };
                                    },
                                    onEnd: () => {
                                        organizationInstance.contact = organizationContacts;
                                        dispatch(updateOrganizationAsync(organizationInstance));
                                    },
                                }}
                            >
                                {contact.location}
                            </Text>
                        </div>
                        <Text type='secondary'>{`Created ${moment(createdDate).format('MMMM Do YYYY')}`}</Text>
                        <Text type='secondary'>{`Updated ${moment(updatedDate).fromNow()}`}</Text>
                    </div>
                </Col>
                <Col span={12} className='cvat-organization-top-bar-buttons-block'>
                    <Space align='end'>
                        {!(owner && userID === owner.id) ? (
                            <Button
                                className='cvat-leave-org-button'
                                type='primary'
                                danger
                                onClick={() => {
                                    Modal.confirm({
                                        onOk: () => {
                                            dispatch(leaveOrganizationAsync(organizationInstance, () => {
                                                localStorage.removeItem('currentOrganization');
                                                window.location.reload();
                                            }));
                                        },
                                        className: 'cvat-modal-organization-leave-confirm',
                                        content: (
                                            <>
                                                <Text>Please, confirm leaving the organization</Text>
                                                <Text strong>{` ${organizationInstance.slug}`}</Text>
                                                <Text>. You will not have access to the organization data anymore</Text>
                                            </>
                                        ),
                                        okText: 'Leave',
                                        okButtonProps: {
                                            danger: true,
                                        },
                                    });
                                }}
                            >
                                Leave organization
                            </Button>
                        ) : null}
                        <Button
                            className='cvat-invite-org-members-button'
                            type='primary'
                            onClick={() => setVisibleInviteModal(true)}
                            icon={<PlusCircleOutlined />}
                        >
                            Invite members
                        </Button>
                    </Space>
                </Col>
            </Row>
            <Modal
                className='cvat-organization-invitation-modal'
                open={visibleInviteModal}
                onCancel={() => {
                    setVisibleInviteModal(false);
                    form.resetFields(['users']);
                }}
                destroyOnClose
                onOk={() => {
                    form.submit();
                }}
            >
                <Form
                    initialValues={{
                        users: [{ email: '', role: 'worker' }],
                    }}
                    onFinish={(values: Store) => {
                        dispatch(
                            inviteOrganizationMembersAsync(organizationInstance, values.users, () => {
                                fetchMembers();
                            }),
                        );
                        setVisibleInviteModal(false);
                        form.resetFields(['users']);
                    }}
                    layout='vertical'
                    form={form}
                >
                    <Paragraph>
                        <Text>Invite CVAT users to collaborate </Text>
                    </Paragraph>
                    <Paragraph>
                        <Text type='secondary'>
                            If the email address is registered on CVAT, the user will be added to the organization
                        </Text>
                    </Paragraph>
                    <Form.List name='users'>
                        {(fields, { add, remove }) => (
                            <>
                                {fields.map((field: any, index: number) => (
                                    <Row className='cvat-organization-invitation-field' key={field.key}>
                                        <Col span={10}>
                                            <Form.Item
                                                className='cvat-organization-invitation-field-email'
                                                hasFeedback
                                                name={[field.name, 'email']}
                                                fieldKey={[field.fieldKey, 'email']}
                                                rules={[
                                                    { required: true, message: 'This field is required' },
                                                    { type: 'email', message: 'The input is not a valid email' },
                                                ]}
                                            >
                                                <Input placeholder='Enter an email address' />
                                            </Form.Item>
                                        </Col>
                                        <Col span={10} offset={1}>
                                            <Form.Item
                                                className='cvat-organization-invitation-field-role'
                                                name={[field.name, 'role']}
                                                fieldKey={[field.fieldKey, 'role']}
                                                initialValue='worker'
                                                rules={[{ required: true, message: 'This field is required' }]}
                                            >
                                                <Select>
                                                    <Select.Option value='worker'>Worker</Select.Option>
                                                    <Select.Option value='supervisor'>Supervisor</Select.Option>
                                                    <Select.Option value='maintainer'>Maintainer</Select.Option>
                                                </Select>
                                            </Form.Item>
                                        </Col>
                                        <Col span={1} offset={1}>
                                            {index > 0 ? (
                                                <DeleteOutlined onClick={() => remove(field.name)} />
                                            ) : null}
                                        </Col>
                                    </Row>
                                ))}
                                <Form.Item>
                                    <Button className='cvat-invite-more-org-members-button' icon={<PlusCircleOutlined />} onClick={() => add()}>
                                        Invite more
                                    </Button>
                                </Form.Item>
                            </>
                        )}
                    </Form.List>
                </Form>
            </Modal>
        </>
    );
}

export default React.memo(OrganizationTopBar);
