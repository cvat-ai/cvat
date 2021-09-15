// Copyright (C) 2020-2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React, { useState } from 'react';
import Popover, { PopoverProps } from 'antd/lib/popover';
import waitFor from 'utils/wait-for';

export default function withVisibilityHandling(WrappedComponent: typeof Popover, popoverType: string) {
    return (props: PopoverProps): JSX.Element => {
        const [visible, setVisible] = useState<boolean>(false);
        const { overlayClassName, ...rest } = props;
        const overlayClassNames = typeof overlayClassName === 'string' ? overlayClassName.split(/\s+/) : [];
        const popoverClassName = `cvat-${popoverType}-popover`;
        const visiblePopoverClassName = `cvat-${popoverType}-popover-visible`;
        overlayClassNames.push(popoverClassName);
        if (visible) {
            overlayClassNames.push(visiblePopoverClassName);
        }

        return (
            <WrappedComponent
                {...rest}
                trigger={visible ? 'click' : 'hover'}
                overlayClassName={overlayClassNames.join(' ').trim()}
                onVisibleChange={(_visible: boolean) => {
                    const [element] = window.document.getElementsByClassName(popoverClassName);
                    if (element) {
                        if (_visible) {
                            element.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
                            waitFor(60, () => {
                                const style = window.getComputedStyle(element);
                                return style.display !== 'none' && style.pointerEvents !== 'none';
                            }).then(() => {
                                setVisible(_visible);
                            });
                        } else {
                            setVisible(_visible);
                        }
                    }
                }}
            />
        );
    };
}
