// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useCallback } from 'react';
import { useDispatch, useSelector, shallowEqual } from 'react-redux';
import Dropdown from 'antd/lib/dropdown';
import { MenuProps } from 'antd/lib/menu';
import { Request, RQStatus } from 'cvat-core-wrapper';
import { cancelRequestAsync } from 'actions/requests-async-actions';
import { makeBulkOperationAsync } from 'actions/bulk-actions';
import { CombinedState } from 'reducers';

interface Props {
    requestInstance: Request;
    triggerElement: (menuItems: NonNullable<MenuProps['items']>) => JSX.Element | null;
    dropdownTrigger?: ('click' | 'hover' | 'contextMenu')[];
}

function RequestActionsComponent(props: Readonly<Props>): JSX.Element | null {
    const {
        requestInstance,
        triggerElement,
        dropdownTrigger,
    } = props;
    const dispatch = useDispatch();
    const {
        selectedIds,
        requestsMap,
        cancelled,
    } = useSelector((state: CombinedState) => ({
        selectedIds: state.requests.selected,
        requestsMap: state.requests.requests,
        cancelled: state.requests.cancelled,
    }), shallowEqual);

    const allRequests = Object.values(requestsMap);
    const isCardMenu = !dropdownTrigger;

    const downloadable = (_request: Request): boolean => !!_request.url && !cancelled[_request.id];
    const cancelable = (_request: Request): boolean => _request.status === RQStatus.QUEUED && !cancelled[_request.id];

    let requestsToAct: Request[];
    if (isCardMenu && !downloadable(requestInstance) && !cancelable(requestInstance)) {
        requestsToAct = [requestInstance];
    } else if (selectedIds.includes(requestInstance.id)) {
        requestsToAct = allRequests.filter((r) => selectedIds.includes(r.id));
    } else {
        requestsToAct = [requestInstance];
    }

    const onDownload = useCallback(() => {
        const requestsToDownload = requestsToAct.filter(downloadable);

        if (requestsToDownload.length === 0) {
            return;
        }

        requestsToDownload.forEach((request) => {
            const downloadAnchor = window.document.getElementById('downloadAnchor') as HTMLAnchorElement;
            downloadAnchor.href = request.url!;
            downloadAnchor.click();
        });
    }, [requestsToAct]);

    const onCancel = useCallback(() => {
        const requestsToCancel = requestsToAct.filter(cancelable);

        if (requestsToCancel.length === 0) {
            return;
        }

        dispatch(makeBulkOperationAsync(
            requestsToCancel,
            async (request) => {
                await dispatch(cancelRequestAsync(request));
            },
            (request, idx, total) => `Canceling request #${request.id} (${idx + 1}/${total})`,
        ));
    }, [requestsToAct]);

    // Helper to show count in label for bulk actions
    const queuedCount = requestsToAct.filter(cancelable).length;
    const downloadableCount = requestsToAct.filter(downloadable).length;
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

    const renderedTrigger = triggerElement(menuItems);
    if (!renderedTrigger) {
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
            {renderedTrigger}
        </Dropdown>
    );
}

export default React.memo(RequestActionsComponent);
