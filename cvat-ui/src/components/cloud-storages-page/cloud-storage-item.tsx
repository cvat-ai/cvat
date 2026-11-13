// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useHistory } from 'react-router';
import dayjs from 'dayjs';
import { QuestionCircleOutlined, MoreOutlined } from '@ant-design/icons';
import Paragraph from 'antd/lib/typography/Paragraph';
import Text from 'antd/lib/typography/Text';
import Button from 'antd/lib/button';
import Modal from 'antd/lib/modal';

import { shallowEqual } from 'utils/redux';
import { CombinedState } from 'reducers';
import { deleteCloudStorageAsync } from 'actions/cloud-storage-actions';
import { makeBulkOperationAsync } from 'actions/bulk-actions';
import CVATTooltip from 'components/common/cvat-tooltip';
import Preview from 'components/common/preview';
import ResourceCard from 'components/common/resource-card';
import { useContextMenuClick } from 'utils/hooks';
import CloudStorageActionsMenu from './cloud-storage-actions-menu';
import Status from './cloud-storage-status';

interface Props {
    cloudStorage: CombinedState['cloudStorages']['current'][number];
    selected: boolean;
    onClick: () => void;
}

export default function CloudStorageItemComponent(props: Readonly<Props>): JSX.Element {
    const history = useHistory();
    const dispatch = useDispatch();
    const { itemRef, handleContextMenuClick, handleContextMenuCapture } = useContextMenuClick<HTMLDivElement>();

    const { cloudStorage, selected = false, onClick = () => {} } = props;
    const {
        id,
        displayName,
        providerType,
        owner,
        updatedDate,
        description,
    } = cloudStorage;
    const ownerName = owner?.username;

    const {
        deletes,
        selectedIds,
        currentCloudStorages,
    } = useSelector((state: CombinedState) => ({
        deletes: state.cloudStorages.activities.deletes,
        selectedIds: state.cloudStorages.selected,
        currentCloudStorages: state.cloudStorages.current,
    }), shallowEqual);
    const deleted = cloudStorage.id in deletes ? deletes[cloudStorage.id] : false;
    const isBulkMode = selectedIds.length > 1;

    const onUpdate = useCallback(() => {
        history.push(`/cloudstorages/update/${id}`);
    }, []);

    const onDelete = useCallback(() => {
        const cloudStoragesToDelete = currentCloudStorages.filter((storage) => selectedIds.includes(storage.id));
        Modal.confirm({
            title: isBulkMode ?
                `Delete ${cloudStoragesToDelete.length} selected cloud storages` :
                'Please, confirm your action',
            content: isBulkMode ?
                'All selected cloud storages will be permanently removed. Continue?' :
                `You are going to remove the cloudstorage "${displayName}". Continue?`,
            className: 'cvat-modal-confirm-delete-cloud-storage',
            onOk: () => {
                dispatch(makeBulkOperationAsync(
                    cloudStoragesToDelete.length ? cloudStoragesToDelete : [cloudStorage],
                    async (storage) => {
                        await dispatch(deleteCloudStorageAsync(storage));
                    },
                    (storage, idx, total) => `Deleting cloud storage #${storage.id} (${idx + 1}/${total})`,
                ));
            },
            okButtonProps: {
                type: 'primary',
                danger: true,
            },
            okText: isBulkMode ? 'Delete selected' : 'Delete',
        });
    }, [cloudStorage, currentCloudStorages, selectedIds, isBulkMode, displayName]);

    const card = (
        <ResourceCard
            cardRef={itemRef}
            id={id}
            preview={(
                <Preview
                    cloudStorage={cloudStorage}
                    loadingClassName='cvat-cloud-storage-item-loading-preview'
                    emptyPreviewClassName='cvat-cloud-storage-item-empty-preview'
                    previewClassName='cvat-cloud-storage-item-preview'
                />
            )}
            tags={[{ key: 'provider', content: providerType }]}
            mediaOverlay={(
                <div className='cvat-cloud-storage-status'>
                    <Status cloudStorage={cloudStorage} />
                </div>
            )}
            title={(
                <div className='cvat-cloud-storage-title'>
                    <Paragraph ellipsis={{ tooltip: displayName }}>{displayName}</Paragraph>
                    {description && (
                        <CVATTooltip overlay={description}>
                            <QuestionCircleOutlined className='cvat-cloud-storage-description-icon' />
                        </CVATTooltip>
                    )}
                </div>
            )}
            descriptions={[
                {
                    label: 'Owner',
                    value: (
                        <Text
                            ellipsis={{ tooltip: ownerName }}
                            className='cvat-resource-card-line'
                        >
                            {ownerName}
                        </Text>
                    ),
                },
                { label: 'Updated', value: dayjs(updatedDate).fromNow() },
            ]}
            menu={(
                <Button
                    type='text'
                    onClick={handleContextMenuClick}
                    className='cvat-cloud-storage-item-menu-button cvat-actions-menu-button'
                    icon={<MoreOutlined className='cvat-menu-icon' />}
                />
            )}
            selected={selected}
            isDisabled={deleted}
            className='cvat-cloud-storage-item'
            onClick={onClick}
            onContextMenuCapture={handleContextMenuCapture}
        />
    );

    return (
        <CloudStorageActionsMenu
            onUpdate={onUpdate}
            onDelete={onDelete}
            selectedIds={selectedIds}
            dropdownTrigger={['contextMenu']}
            triggerElement={card}
        />
    );
}
