// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';

import React from 'react';
import { Col, Row } from 'antd/lib/grid';
import Card from 'antd/lib/card';
import Text from 'antd/lib/typography/Text';
import Button from 'antd/lib/button';

import { Invitation } from 'cvat-core/src/organization';

interface Props {
    invitation: Invitation;
    onAccept: () => void;
    onReject: () => void;
}

function InvitationItem(props: Props): JSX.Element {
    const { invitation } = props;

    return (
        <Col span={24}>
            <Card className='cvat-invitation-item'>
                <Row justify='space-between'>
                    <Col className='cvat-invitation-description'>
                        <Text>
                            You&apos;ve been invited to an organization&nbsp;
                            <strong>{invitation.organization.slug}</strong>
                                    &nbsp;by&nbsp;
                            <strong>{invitation.owner?.username}</strong>
                        </Text>
                    </Col>
                    <Col className='cvat-invitation-actions'>
                        <Button type='primary'>Accept</Button>
                        <Button type='ghost'>Reject</Button>
                    </Col>
                </Row>
            </Card>
        </Col>
    );
}

export default React.memo(InvitationItem);
