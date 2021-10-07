// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { Row, Col } from 'antd/lib/grid';
import Text from 'antd/lib/typography/Text';
import moment from 'moment';
import { Button, Space } from 'antd';
import { PlusCircleOutlined } from '@ant-design/icons';

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
            <Col>
                <Space align='end'>
                    {userID !== owner.id ? (
                        <Button type='primary' danger>
                            Remove organization
                        </Button>
                    ) : null}
                    {userID === owner.id ? (
                        <Button type='primary' danger>
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
