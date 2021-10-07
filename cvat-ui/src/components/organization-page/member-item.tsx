// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import Select from 'antd/lib/select';
import Text from 'antd/lib/typography/Text';
import { Row, Col } from 'antd/lib/grid';
import moment from 'moment';
import { CloseOutlined } from '@ant-design/icons';

export interface Props {
    ownerID: number;
    membershipInstance: any;
}

function MemberItem(props: Props): JSX.Element {
    const { membershipInstance, ownerID } = props;
    const { user, joined_date: joinedDate, role } = membershipInstance;
    const { username, firstName, lastName } = user;

    return (
        <Row className='cvat-organization-member-item' justify='space-between'>
            <Col span={5} className='cvat-organization-member-item-username'>
                <Text strong>{username}</Text>
            </Col>
            <Col span={6} className='cvat-organization-member-item-name'>
                <Text strong>{`${firstName}Boris Sekachev ${lastName}`}</Text>
            </Col>
            <Col span={8} className='cvat-organization-member-item-dates'>
                <Text type='secondary'>{`Joined ${moment(joinedDate).fromNow()}`}</Text>
            </Col>
            <Col span={3} className='cvat-organization-member-item-role'>
                <Select value={role} disabled={user.id === ownerID}>
                    <Select.Option value='worker'>Worker</Select.Option>
                    <Select.Option value='supervisor'>Supervisor</Select.Option>
                    <Select.Option value='maintainer'>Maintainer</Select.Option>
                </Select>
            </Col>
            <Col span={1} className='cvat-organization-member-item-remove'>
                <CloseOutlined />
            </Col>
        </Row>
    );
}

export default React.memo(MemberItem);

// TODO: get information about who invited
// TODO: add dialog to leave organization
// TODO: add dialog to remove organization
// TODO: add dialog to kick user
// Write core code to invite/kick and remove organization
