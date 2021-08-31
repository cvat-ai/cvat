// Copyright (C) 2020-2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React, { useState } from 'react';
import Popover, { PopoverProps } from 'antd/lib/popover';

export default function withVisibilityHandling(WrappedComponent: typeof Popover, popoverType: string) {
    return (props: PopoverProps): JSX.Element => {
        const [visible, setVisible] = useState<boolean>(false);
        const { overlayClassName, ...rest } = props;
        const overlayClassNames = typeof overlayClassName === 'string' ? overlayClassName.split(/\s+/) : [];

        const popoverClassName = `cvat-${popoverType}-popover`;
        overlayClassNames.push(popoverClassName);
        if (visible) {
            const visiblePopoverClassName = `cvat-${popoverType}-popover-visible`;
            overlayClassNames.push(visiblePopoverClassName);
        }

        return (
            <WrappedComponent
                {...rest}
                trigger={visible ? 'click' : 'hover'}
                overlayClassName={overlayClassNames.join(' ').trim()}
                afterVisibleChange={(_visible: boolean) => {
                    setVisible(_visible);
                }}
                onVisibleChange={(_visible: boolean) => {
                    if (_visible) {
                        // Hide other popovers
                        const element = window.document.getElementsByClassName(`${popoverClassName}`)[0];
                        if (element) {
                            element.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
                        }
                    }
                }}
            />
        );
    };
}
