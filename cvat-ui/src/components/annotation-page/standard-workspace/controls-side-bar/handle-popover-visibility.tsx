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

        return (
            <WrappedComponent
                {...rest}
                trigger={visible ? 'click' : 'hover'}
                overlayClassName={overlayClassNames.join(' ').trim()}
                onVisibleChange={(_visible: boolean) => {
                    if (_visible) {
                        const [element] = window.document.getElementsByClassName(popoverClassName);
                        if (element) {
                            element.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
                        }
                    }
                    setVisible(_visible);
                }}
            />
        );
    };
}
