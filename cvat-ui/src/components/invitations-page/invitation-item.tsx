// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';

import React from 'react';
import { Col, Row } from 'antd/lib/grid';
import Card from 'antd/lib/card';
import Text from 'antd/lib/typography/Text';
import Button from 'antd/lib/button';
import Modal from 'antd/lib/modal';
import Badge from 'antd/lib/badge';

import { Invitation } from 'cvat-core/src/organization';

interface Props {
    invitation: Invitation;
    onAccept: (invitationKey: string) => void;
    onReject: (invitationKey: string) => void;
}

function InvitationItem(props: Props): JSX.Element {
    const { invitation, onAccept, onReject } = props;
    const { key, expired } = invitation;

    const { slug } = invitation.organizationInfo;
    const owner = invitation.owner?.username;

    const text = (
        <Text>
            You&apos;ve been invited to an organization&nbsp;
            <strong>{slug}</strong>
            &nbsp;by&nbsp;
            <strong>{owner}</strong>
        </Text>
    );

    return (
        <Col span={24}>
            <Badge.Ribbon
                style={{ visibility: expired ? 'visible' : 'hidden' }}
                className='cvat-invitation-item-ribbon'
                placement='start'
                text='Expired'
                color='gray'
            >
                <Card className='cvat-invitation-item'>
                    <Row justify='space-between'>
                        <Col className='cvat-invitation-description'>
                            {text}
                        </Col>
                        <Col className='cvat-invitation-actions'>
                            <Button
                                type='primary'
                                disabled={expired}
                                onClick={() => {
                                    Modal.confirm({
                                        title: text,
                                        content: 'Would you like to join?',
                                        className: 'cvat-invitaion-accept-modal',
                                        onOk: () => {
                                            onAccept(key);
                                        },
                                    });
                                }}
                            >
                                Accept
                            </Button>
                            <Button
                                type='ghost'
                                onClick={() => {
                                    Modal.confirm({
                                        title: text,
                                        content: 'Would you like to reject the invitation?',
                                        className: 'cvat-invitaion-reject-modal',
                                        onOk: () => {
                                            onReject(key);
                                        },
                                    });
                                }}
                            >
                                Reject
                            </Button>
                        </Col>
                    </Row>
                </Card>
            </Badge.Ribbon>
        </Col>
    );
}

export default React.memo(InvitationItem);
