// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import Card from 'antd/lib/card';
import Meta from 'antd/lib/card/Meta';
import Paragraph from 'antd/lib/typography/Paragraph';
import Text from 'antd/lib/typography/Text';
import moment from 'moment';

import { CloudSyncOutlined } from '@ant-design/icons';
import { CloudStorage } from 'reducers/interfaces';

interface Props {
    cloudStorageInstance: CloudStorage;
}

export default function CloudStorageItemComponent(props: Props): JSX.Element {
    const { cloudStorageInstance } = props;
    const {
        id, displayName, preview, provider, owner, createdDate, updatedDate,
    } = cloudStorageInstance;

    return (
        <Card
            cover={
                preview ? (
                    <img className='cvat-cloud-storage-item-preview' src={preview} alt='Preview image' aria-hidden />
                ) : (
                    <div className='cvat-cloud-storage-item-empty-preview' aria-hidden>
                        <CloudSyncOutlined />
                    </div>
                )
            }
            size='small'
            className='cvat-cloud-storage-item'
        >
            <Meta
                title={(
                    <Paragraph>
                        <Text strong>{`#${id}: `}</Text>
                        <Text>{displayName}</Text>
                    </Paragraph>
                )}
                description={(
                    <>
                        <Paragraph>
                            <Text type='secondary'>Provider: </Text>
                            <Text>{provider}</Text>
                        </Paragraph>
                        <Paragraph>
                            <Text type='secondary'>Created </Text>
                            {owner ? <Text type='secondary'>{`by ${owner.username}`}</Text> : null}
                            <Text type='secondary'> on </Text>
                            <Text type='secondary'>{moment(createdDate).format('MMMM Do YYYY')}</Text>
                        </Paragraph>
                        <Paragraph>
                            <Text type='secondary'>Last updated </Text>
                            <Text type='secondary'>{moment(updatedDate).fromNow()}</Text>
                        </Paragraph>
                        <Paragraph>
                            <Text type='secondary'>Status: </Text>
                            <Text type='warning'>Not implemented</Text>
                        </Paragraph>
                    </>
                )}
            />
        </Card>
    );
}
