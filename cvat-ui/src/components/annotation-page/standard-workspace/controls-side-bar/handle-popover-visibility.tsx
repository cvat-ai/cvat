// Copyright (C) 2020-2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React, { useLayoutEffect, useState } from 'react';
import Popover, { PopoverProps } from 'antd/lib/popover';

export default function withVisibilityHandling(WrappedComponent: typeof Popover, popoverType: string) {
    return (props: PopoverProps): JSX.Element => {
        const [initialized, setInitialized] = useState<boolean>(false);
        const [visible, setVisible] = useState<boolean>(false);
        const { overlayClassName, ...rest } = props;
        const overlayClassNames = typeof overlayClassName === 'string' ? overlayClassName.split(/\s+/) : [];
        const popoverClassName = `cvat-${popoverType}-popover`;
        const visiblePopoverClassName = `cvat-${popoverType}-popover-visible`;
        overlayClassNames.push(popoverClassName);
        const [classList, setClassList] = useState<string[]>(overlayClassNames);
        if (visible) {
            overlayClassNames.push(visiblePopoverClassName);
        }

        useLayoutEffect(() => {
            if (visible) {
                const [element] = window.document.getElementsByClassName(popoverClassName);
                if (element && !initialized) {
                    setInitialized(true);
                    element.addEventListener('animationend', (event: Event) => {
                        if ((event as AnimationEvent).animationName === 'antZoomBigIn') {
                            setTimeout(() => {
                                setClassList(overlayClassNames);
                            });
                        }
                    });
                }
            } else {
                setClassList(overlayClassNames);
            }
        }, [visible]);

        return (
            <WrappedComponent
                {...rest}
                trigger={visible ? 'click' : 'hover'}
                overlayClassName={classList.join(' ').trim()}
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
