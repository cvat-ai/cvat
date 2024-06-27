// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) 2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import Popover, { PopoverProps } from 'antd/lib/popover';

interface OwnProps {
    overlayClassName?: string;
    onVisibleChange?: (visible: boolean) => void;
}

export default function withVisibilityHandling(WrappedComponent: typeof Popover, popoverType: string) {
    return function (props: OwnProps & PopoverProps): JSX.Element {
        const { overlayClassName, onOpenChange, ...rest } = props;
        const overlayClassNames = typeof overlayClassName === 'string' ? overlayClassName.split(/\s+/) : [];
        const popoverClassName = `cvat-${popoverType}-popover`;
        overlayClassNames.push(popoverClassName);

        const { overlayStyle } = props;
        return (
            <WrappedComponent
                {...rest}
                overlayStyle={{
                    ...(typeof overlayStyle === 'object' ? overlayStyle : {}),
                }}
                trigger={['click']}
                overlayClassName={overlayClassNames.join(' ').trim()}
                onOpenChange={(_visible: boolean) => {
                    if (_visible) {
                        const [element] = window.document.getElementsByClassName(popoverClassName);
                        if (element) {
                            element.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
                            (element as HTMLElement).style.pointerEvents = '';
                            (element as HTMLElement).style.opacity = '';
                        }
                    }
                    if (onOpenChange) onOpenChange(_visible);
                }}
            />
        );
    };
}
