// Copyright (C) CVAT.ai Corporation
// SPDX-License-Identifier: MIT

import React, { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Dropdown from 'antd/lib/dropdown';
import { MenuProps } from 'antd/lib/menu';
import { Request, RQStatus } from 'cvat-core-wrapper';
import { cancelRequestAsync } from 'actions/requests-async-actions';
import { requestsActions } from 'actions/requests-actions';
import { makeBulkOperationAsync } from 'actions/selection-actions';
import { CombinedState } from 'reducers';

interface Props {
    requestInstance: Request;
    triggerElement: JSX.Element;
    dropdownTrigger?: ('click' | 'hover' | 'contextMenu')[];
}

function RequestActionsComponent(props: Readonly<Props>): JSX.Element | null {
    const { requestInstance, triggerElement, dropdownTrigger } = props;
    const dispatch = useDispatch();
    const selectedIds = useSelector((state: CombinedState) => state.selection.selected);
    const allRequests = useSelector((state: CombinedState) => Object.values(state.requests.requests));

    const requestsToAct = selectedIds.includes(requestInstance.id) ?
        allRequests.filter((r) => selectedIds.includes(r.id)) :
        [requestInstance];

    const onDownload = useCallback(() => {
        requestsToAct.forEach((request) => {
            if (request.url) {
                const downloadAnchor = window.document.getElementById('downloadAnchor') as HTMLAnchorElement;
                downloadAnchor.href = request.url;
                downloadAnchor.click();
            }
        });
    }, [requestsToAct]);

    const onCancel = useCallback(() => {
        dispatch(makeBulkOperationAsync(
            requestsToAct,
            async (request) => {
                await dispatch(cancelRequestAsync(request, () => {
                    dispatch(requestsActions.disableRequest(request));
                }));
            },
            (request, idx, total) => `Canceling request #${request.id} (${idx + 1}/${total})`,
        ));
    }, [requestsToAct]);

    // Helper to show count in label for bulk actions
    const queuedCount = requestsToAct.filter((r) => r.status === RQStatus.QUEUED).length;
    const downloadableCount = requestsToAct.filter((r) => !!r.url).length;
    function withCount(label: string, count: number): React.ReactNode {
        if (count > 1) {
            return `${label} (${count})`;
        }
        return label;
    }

    const menuItems: NonNullable<MenuProps['items']> = [];
    if (downloadableCount > 0) {
        menuItems.push({
            key: 'download',
            label: withCount('Download', downloadableCount),
            onClick: onDownload,
        });
    }
    if (queuedCount > 0) {
        menuItems.push({
            key: 'cancel',
            label: withCount('Cancel', queuedCount),
            onClick: onCancel,
        });
    }

    if (menuItems.length === 0) {
        return null;
    }

    return (
        <Dropdown
            destroyPopupOnHide
            trigger={dropdownTrigger || ['click']}
            menu={{
                items: menuItems,
                triggerSubMenuAction: 'click',
                className: 'cvat-request-menu',
            }}
        >
            {triggerElement}
        </Dropdown>
    );
}

export default React.memo(RequestActionsComponent);
