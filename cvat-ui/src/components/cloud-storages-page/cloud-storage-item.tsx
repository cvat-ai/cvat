// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useCallback } from 'react';
import { shallowEqual, useDispatch, useSelector } from 'react-redux';
import { useHistory } from 'react-router';
import { QuestionCircleOutlined } from '@ant-design/icons';
import Card from 'antd/lib/card';
import Meta from 'antd/lib/card/Meta';
import Paragraph from 'antd/lib/typography/Paragraph';
import Text from 'antd/lib/typography/Text';
import Modal from 'antd/lib/modal';
import moment from 'moment';

import { CloudStorage, CombinedState } from 'reducers';
import { deleteCloudStorageAsync } from 'actions/cloud-storage-actions';
import CVATTooltip from 'components/common/cvat-tooltip';
import Preview from 'components/common/preview';
import CloudStorageActionsMenu from './cloud-storage-actions-menu';
import Status from './cloud-storage-status';

interface Props {
    cloudStorage: CloudStorage;
    selected: boolean;
    onClick: () => void;
}

export default function CloudStorageItemComponent(props: Readonly<Props>): JSX.Element {
    const history = useHistory();
    const dispatch = useDispatch();

    const { cloudStorage, selected = false, onClick = () => {} } = props;
    const {
        id,
        displayName,
        providerType,
        owner,
        createdDate,
        updatedDate,
        description,
    } = cloudStorage;

    const {
        deletes,
        selectedIds,
    } = useSelector((state: CombinedState) => ({
        deletes: state.cloudStorages.activities.deletes,
        selectedIds: state.cloudStorages.selected,
    }), shallowEqual);
    const deleted = cloudStorage.id in deletes ? deletes[cloudStorage.id] : false;

    const style: React.CSSProperties = {};
    if (deleted) {
        style.pointerEvents = 'none';
        style.opacity = 0.5;
    }
    const cardClassName = `cvat-cloud-storage-item${selected ? ' cvat-item-selected' : ''}`;

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
        <CloudStorageActionsMenu
            onUpdate={onUpdate}
            onDelete={onDelete}
            selectedIds={selectedIds}
            dropdownTrigger={['contextMenu']}
            triggerElement={(
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
                    className={cardClassName}
                    hoverable
                    onClick={onClick}
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
                                <CloudStorageActionsMenu
                                    onUpdate={onUpdate}
                                    onDelete={onDelete}
                                    selectedIds={selectedIds}
                                />
                            </>
                        )}
                    />
                </Card>
            )}
        />
    );
}
