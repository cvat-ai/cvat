// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useCallback, useState } from 'react';
import { MoreOutlined } from '@ant-design/icons';
import Button from 'antd/lib/button';
import Dropdown from 'antd/lib/dropdown';
import { useContextActionsMenuClick } from 'utils/hooks';

interface Props {
    onUpdate: () => void;
    onDelete: () => void;
    selectedIds: number[];
    triggerElement?: JSX.Element;
    dropdownTrigger?: ('click' | 'hover' | 'contextMenu')[];
}

export default function CloudStorageActionsMenu(props: Props): JSX.Element {
    const {
        onUpdate, onDelete, selectedIds, triggerElement, dropdownTrigger,
    } = props;
    const isBulkMode = selectedIds.length > 1;
    const bulkAllowedKeys = ['delete'];
    const isDisabled = (key: string): boolean => isBulkMode && !bulkAllowedKeys.includes(key);

    const onContextActionsMenuClick = useContextActionsMenuClick();
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const onWrapperContextMenu = useCallback(() => {
        setDropdownOpen(false);
    }, []);

    const withCount = (label: string, key: string): string => {
        if (isBulkMode && bulkAllowedKeys.includes(key)) {
            return `${label} (${selectedIds.length})`;
        }
        return label;
    };

    const items = [
        {
            key: 'update',
            label: withCount('Update', 'update'),
            onClick: onUpdate,
            disabled: isDisabled('update'),
        },
        {
            key: 'delete',
            label: withCount('Delete', 'delete'),
            onClick: onDelete,
            disabled: isDisabled('delete'),
        },
    ];

    return (
        <Dropdown
            trigger={dropdownTrigger || ['click']}
            destroyPopupOnHide
            open={dropdownOpen}
            onOpenChange={setDropdownOpen}
            menu={{
                className: 'cvat-cloud-storage-actions-menu',
                items,
                onContextMenu: onContextActionsMenuClick,
            }}
        >
            {(!dropdownTrigger || dropdownTrigger.includes('click')) && triggerElement ? (
                <div
                    className='cvat-actions-menu-trigger-wrapper'
                    onContextMenu={onWrapperContextMenu}
                >
                    {triggerElement}
                </div>
            ) : (
                triggerElement || (
                    <Button
                        className='cvat-cloud-storage-item-menu-button cvat-actions-menu-button'
                        type='link'
                        size='large'
                        icon={<MoreOutlined />}
                    />
                )
            )}
        </Dropdown>
    );
}
