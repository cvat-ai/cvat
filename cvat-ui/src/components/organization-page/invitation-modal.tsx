// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { useForm } from 'antd/lib/form/Form';
import Form from 'antd/lib/form';
import { Row, Col } from 'antd/lib/grid';
import Modal from 'antd/lib/modal';
import Paragraph from 'antd/lib/typography/Paragraph';
import Text from 'antd/lib/typography/Text';
import Select from 'antd/lib/select';
import { Store } from 'antd/lib/form/interface';
import { DeleteOutlined, PlusCircleOutlined } from '@ant-design/icons';
import Button from 'antd/lib/button';
import Input from 'antd/lib/input';

interface Props {
    onInvite: (values: Store) => void;
    onCancelInvite: () => void;
}

function InvitationModal(props: Props): JSX.Element {
    const { onInvite, onCancelInvite } = props;
    const [form] = useForm();

    return (
        <Modal
            className='cvat-organization-invitation-modal'
            open
            onCancel={() => {
                form.resetFields(['users']);
                onCancelInvite();
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
                    form.resetFields(['users']);
                    onInvite(values);
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
    );
}

export default React.memo(InvitationModal);
