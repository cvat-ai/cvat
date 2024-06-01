// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) 2022-2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useHistory } from 'react-router';
import { MoreOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import Card from 'antd/lib/card';
import Meta from 'antd/lib/card/Meta';
import Paragraph from 'antd/lib/typography/Paragraph';
import Text from 'antd/lib/typography/Text';
import Button from 'antd/lib/button';
import Dropdown from 'antd/lib/dropdown';
import Modal from 'antd/lib/modal';
import moment from 'moment';

import { CloudStorage, CombinedState } from 'reducers';
import { deleteCloudStorageAsync } from 'actions/cloud-storage-actions';
import CVATTooltip from 'components/common/cvat-tooltip';
import Preview from 'components/common/preview';
import Status from './cloud-storage-status';

interface Props {
    cloudStorage: CloudStorage;
}

export default function CloudStorageItemComponent(props: Props): JSX.Element {
    const history = useHistory();
    const dispatch = useDispatch();

    const { cloudStorage } = props;
    const {
        id,
        displayName,
        providerType,
        owner,
        createdDate,
        updatedDate,
        description,
    } = cloudStorage;
    const deletes = useSelector((state: CombinedState) => state.cloudStorages.activities.deletes);
    const deleted = cloudStorage.id in deletes ? deletes[cloudStorage.id] : false;

    const style: React.CSSProperties = {};

    if (deleted) {
        style.pointerEvents = 'none';
        style.opacity = 0.5;
    }

    const onUpdate = useCallback(() => {
        history.push(`/cloudstorages/update/${id}`);
    }, []);

    const onDelete = useCallback(() => {
        Modal.confirm({
            title: 'Please, confirm your action',
            content: `You are going to remove the cloudstorage "${displayName}". Continue?`,
            className: 'cvat-delete-cloud-storage-modal',
            onOk: () => {
                dispatch(deleteCloudStorageAsync(cloudStorage));
            },
            okButtonProps: {
                type: 'primary',
                danger: true,
            },
            okText: 'Delete',
        });
    }, [cloudStorage.id]);

    return (
        <Card
            cover={(
                <>
                    <Preview
                        cloudStorage={cloudStorage}
                        loadingClassName='cvat-cloud-storage-item-loading-preview'
                        emptyPreviewClassName='cvat-cloud-storage-item-empty-preview'
                        previewClassName='cvat-cloud-storage-item-preview'
                    />
                    {description ? (
                        <CVATTooltip overlay={description}>
                            <QuestionCircleOutlined className='cvat-cloud-storage-description-icon' />
                        </CVATTooltip>
                    ) : null}
                </>
            )}
            size='small'
            style={style}
            className='cvat-cloud-storage-item'
            hoverable
        >
            <Meta
                title={(
                    <Paragraph ellipsis={{ tooltip: displayName }}>
                        <Text strong>{`#${id}: `}</Text>
                        <Text>{displayName}</Text>
                    </Paragraph>
                )}
                description={(
                    <>
                        <Paragraph>
                            <Text type='secondary'>Provider: </Text>
                            <Text>{providerType}</Text>
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
                        <Status cloudStorage={cloudStorage} />
                        <Dropdown
                            trigger={['click']}
                            destroyPopupOnHide
                            menu={{
                                className: 'cvat-cloud-storage-actions-menu',
                                items: [{
                                    key: 'update',
                                    label: 'Update',
                                    onClick: onUpdate,
                                }, {
                                    key: 'delete',
                                    label: 'Delete',
                                    onClick: onDelete,
                                }],
                            }}
                        >
                            <Button
                                className='cvat-cloud-storage-item-menu-button'
                                type='link'
                                size='large'
                                icon={<MoreOutlined />}
                            />
                        </Dropdown>
                    </>
                )}
            />
        </Card>
    );
}
