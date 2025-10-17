// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useCallback } from 'react';

interface Props {
    triggerElement: JSX.Element;
    dropdownTrigger?: ('click' | 'hover' | 'contextMenu')[];
    onWrapperContextMenu: () => void;
    fallbackElement?: JSX.Element;
}

export default function ActionsMenuTriggerWrapper(props: Readonly<Props>): JSX.Element {
    const {
        triggerElement,
        dropdownTrigger,
        onWrapperContextMenu,
        fallbackElement,
    } = props;

    const onContextMenu = useCallback(() => {
        onWrapperContextMenu();
    }, [onWrapperContextMenu]);

    if (!dropdownTrigger || dropdownTrigger.includes('click')) {
        if (triggerElement) {
            return (
                <div
                    className='cvat-actions-menu-trigger-wrapper'
                    onContextMenu={onContextMenu}
                >
                    {triggerElement}
                </div>
            );
        }
        if (fallbackElement) {
            return fallbackElement;
        }
    }

    return triggerElement || fallbackElement || <div />;
}
