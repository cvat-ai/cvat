// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useCallback } from 'react';
import { useHistory } from 'react-router';
import { shallowEqual, useDispatch, useSelector } from 'react-redux';
import Dropdown from 'antd/lib/dropdown';
import Modal from 'antd/lib/modal';
import { MenuProps } from 'antd/lib/menu';

import { Webhook } from 'cvat-core-wrapper';
import { CombinedState } from 'reducers';
import { deleteWebhookAsync } from 'actions/webhooks-actions';
import { makeBulkOperationAsync } from 'actions/bulk-actions';

interface WebhookActionsMenuProps {
    webhookInstance: Webhook;
    triggerElement: JSX.Element;
    dropdownTrigger?: ('click' | 'hover' | 'contextMenu')[];
}

export default function WebhookActionsMenu(props: Readonly<WebhookActionsMenuProps>): JSX.Element | null {
    const { webhookInstance, triggerElement, dropdownTrigger } = props;

    const history = useHistory();
    const dispatch = useDispatch();

    const {
        selectedIds,
        allWebhooks,
    } = useSelector((state: CombinedState) => ({
        selectedIds: state.webhooks.selected,
        allWebhooks: state.webhooks.current,
    }), shallowEqual);

    const isBulk = selectedIds.length > 1;
    const onEdit = useCallback(() => {
        history.push(`/webhooks/update/${webhookInstance.id}`);
    }, [webhookInstance]);

    const onDelete = useCallback(() => {
        const webhooksToDelete = allWebhooks.filter((webhook) => selectedIds.includes(webhook.id));
        dispatch(makeBulkOperationAsync(
            webhooksToDelete.length ? webhooksToDelete : [webhookInstance],
            async (webhook) => {
                await dispatch(deleteWebhookAsync(webhook));
            },
            (project, idx, total) => `Deleting project #${project.id} (${idx + 1}/${total})`,
        ));
    }, [dispatch, webhookInstance]);

    const menuItems: MenuProps['items'] = [
        {
            key: 'edit',
            label: '编辑',
            onClick: onEdit,
            disabled: isBulk,
        },
        {
            key: 'delete',
            label: isBulk ? `删除（${selectedIds.length}）` : '删除',
            onClick: isBulk ? () => {
                Modal.confirm({
                    title: `确认要移除 ${selectedIds.length} 个 Webhook 吗？`,
                    content: '它们将停止向指定的 URL 通知列出的事件',
                    className: 'cvat-modal-confirm-remove-webhook',
                    onOk: () => onDelete(),
                });
            } : () => {
                Modal.confirm({
                    title: '确认要移除该 Webhook 吗？',
                    content: '它将停止向指定的 URL 通知列出的事件',
                    className: 'cvat-modal-confirm-remove-webhook',
                    onOk: onDelete,
                });
            },
        },
    ];

    return (
        <Dropdown
            trigger={dropdownTrigger || ['click']}
            destroyPopupOnHide
            menu={{
                items: menuItems,
            }}
        >
            {triggerElement}
        </Dropdown>
    );
}


