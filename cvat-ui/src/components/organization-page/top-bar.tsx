// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React, { ChangeEventHandler } from 'react';
import moment from 'moment';
import { Row, Col } from 'antd/lib/grid';
import Text from 'antd/lib/typography/Text';
import Modal from 'antd/lib/modal';
import Button from 'antd/lib/button';
import Space from 'antd/lib/space';
import { PlusCircleOutlined } from '@ant-design/icons';
import { Input } from 'antd';

export interface Props {
    organizationInstance: any;
    userInstance: any;
}

function OrganizationTopBar(props: Props): JSX.Element {
    const { organizationInstance, userInstance } = props;
    const {
        owner, description, createdDate, updatedDate, slug,
    } = organizationInstance;
    const { id: userID } = userInstance;

    return (
        <Row justify='space-between'>
            <Col span={12}>
                <div className='cvat-organization-top-bar-descriptions'>
                    <Text className='cvat-title'>{`Organization: ${slug}`}</Text>
                    {description ? <Text type='secondary'>{description}</Text> : null}
                    <Text type='secondary'>{`Created ${moment(createdDate).format('MMMM Do YYYY')}`}</Text>
                    <Text type='secondary'>{`Updated ${moment(updatedDate).fromNow()}`}</Text>
                </div>
            </Col>
            <Col span={12} className='cvat-organization-top-bar-buttons-block'>
                <Space align='end'>
                    {userID === owner.id ? (
                        <Button type='primary' danger onClick={() => {
                            Modal.confirm({
                                onOk: () => {
                                    // TODO
                                },
                                content: (
                                    <>
                                        <Text>
                                            Please, confirm leaving the organization
                                        </Text>
                                        <Text strong>
                                            {` ${organizationInstance.slug}`}
                                        </Text>
                                        <Text>
                                            . You will not have access to organization data anymore
                                        </Text>
                                    </>
                                ),
                                okText: 'Leave',
                                okButtonProps: {
                                    danger: true,
                                }
                            })
                        }}>
                            Leave organization
                        </Button>
                    ) : null}
                    {userID === owner.id ? (
                        <Button type='primary' danger onClick={() => {
                            const modal = Modal.confirm({
                                onOk: () => {
                                    // TODO
                                },
                                content: (
                                    <div className='cvat-remove-organization-submit'>
                                        <Text type='danger'>To remove the organization, enter its short name below</Text>
                                        <Input onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                                             modal.update({
                                                okButtonProps: {
                                                    disabled: event.target.value !== organizationInstance.slug,
                                                    danger: true,
                                                }
                                            });
                                        }} />
                                    </div>
                                ),
                                okButtonProps: {
                                    disabled: true,
                                    danger: true,
                                },
                                okText: 'Remove'
                            });
                        }}
                        >
                            Remove organization
                        </Button>
                    ) : null}
                    <Button type='primary' icon={<PlusCircleOutlined />}>
                        Invite members
                    </Button>
                </Space>
            </Col>
        </Row>
    );
}

export default React.memo(OrganizationTopBar);
