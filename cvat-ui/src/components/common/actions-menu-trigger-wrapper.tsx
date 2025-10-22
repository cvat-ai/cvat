// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useCallback } from 'react';

interface Props {
    triggerElement: JSX.Element;
    dropdownTrigger?: ('click' | 'hover' | 'contextMenu')[];
    onWrapperContextMenu: () => void;
}

export default function ActionsMenuTriggerWrapper(props: Readonly<Props>): JSX.Element {
    const {
        triggerElement,
        dropdownTrigger,
        onWrapperContextMenu,
        ...rest
    } = props;

    const onContextMenu = useCallback(() => {
        onWrapperContextMenu();
    }, [onWrapperContextMenu]);

    const renderWrapper = !dropdownTrigger || dropdownTrigger.includes('click');

    return (
        <div
            {...rest}
            className='cvat-actions-menu-trigger-wrapper'
            onContextMenu={renderWrapper ? onContextMenu : (rest as React.DOMAttributes<HTMLDivElement>).onContextMenu}
            style={{ display: renderWrapper ? 'flex' : 'contents' }}
        >
            {triggerElement}
        </div>
    );
}
