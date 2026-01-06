// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';

import React, { useState } from 'react';
import { Col, Row } from 'antd/lib/grid';
import Card from 'antd/lib/card';
import Text from 'antd/lib/typography/Text';
import Button from 'antd/lib/button';
import Modal from 'antd/lib/modal';
import Badge from 'antd/lib/badge';

import { Invitation } from 'cvat-core/src/organization';

interface Props {
    invitation: Invitation;
    onAccept: (invitationKey: string) => Promise<void>;
    onDecline: (invitationKey: string) => Promise<void>;
}

function InvitationItem(props: Props): JSX.Element {
    const { invitation, onAccept, onDecline } = props;
    const { key, expired } = invitation;

    const [declined, setDeclined] = useState(false);

    const { slug } = invitation.organizationInfo;
    const owner = invitation.owner?.username;
    const clampOwner = !!owner && owner?.length > 50 && { tooltip: owner };
    const text = (
        <>
            <Text
                strong
                style={clampOwner ? { width: 250 } : {}}
                ellipsis={clampOwner}
            >
                {owner}
            </Text>
            <Text>&nbsp;邀请您加入&nbsp;</Text>
            <Text strong>{slug}</Text>
            <Text>&nbsp;组织&nbsp;</Text>
        </>
    );

    return (
        <Col span={24}>
            <Badge.Ribbon
                style={{ visibility: expired ? 'visible' : 'hidden' }}
                className='cvat-invitation-item-ribbon'
                placement='start'
                text='已过期'
                color='gray'
            >
                <Card className={`cvat-invitation-item ${declined ? 'cvat-invitation-item-declined' : ''}`}>
                    <Row justify='space-between'>
                        <Col className='cvat-invitation-description'>
                            {text}
                        </Col>
                        <Col className='cvat-invitation-actions'>
                            <Button
                                type='primary'
                                disabled={expired}
                                onClick={() => {
                                    onAccept(key);
                                }}
                            >
                                接受
                            </Button>
                            {
                                expired ? (
                                    <Button
                                        type='primary'
                                        danger
                                        onClick={() => {
                                            onDecline(key).then(() => {
                                                setDeclined(true);
                                            });
                                        }}
                                    >
                                        移除
                                    </Button>
                                ) : (
                                    <Button
                                        type='primary'
                                        danger
                                        onClick={() => {
                                            Modal.confirm({
                                                title: (
                                                    <>
                                                        <Text>
                                                            是否拒绝加入&nbsp;
                                                        </Text>
                                                        <Text strong>{slug}</Text>
                                                        <Text>&nbsp;组织&nbsp;</Text>
                                                    </>
                                                ),
                                                className: 'cvat-invitation-decline-modal',
                                                onOk: () => {
                                                    onDecline(key).then(() => {
                                                        setDeclined(true);
                                                    });
                                                },
                                                okText: '拒绝',
                                                okButtonProps: { danger: true },
                                            });
                                        }}
                                    >
                                        拒绝
                                    </Button>
                                )
                            }
                        </Col>
                    </Row>
                </Card>
            </Badge.Ribbon>
        </Col>
    );
}

export default React.memo(InvitationItem);

