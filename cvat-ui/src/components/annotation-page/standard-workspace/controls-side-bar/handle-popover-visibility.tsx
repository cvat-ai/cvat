// Copyright (C) 2020-2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React, { useEffect, useState } from 'react';
import Popover, { PopoverProps } from 'antd/lib/popover';

type PopoverTypeListener = (activePopover: string | null) => void;

let listeners: PopoverTypeListener[] = [];
function updateActivePopoverType(activePopover: string | null): void {
    for (const listener of listeners) {
        listener(activePopover);
    }
}

function subscribePopoverUpdate(onUpdate: PopoverTypeListener): void {
    listeners.push(onUpdate);
}

function unsubscribePopoverUpdate(onUpdate: PopoverTypeListener): void {
    listeners = listeners.filter((listener: PopoverTypeListener) => listener !== onUpdate);
}

function useCurrentActivePopover(): string | null {
    const [activePopover, setActivePopover] = useState<string | null>(null);

    useEffect(() => {
        const listener: PopoverTypeListener = (newActivePopover: string | null) => {
            setActivePopover(newActivePopover);
        };

        subscribePopoverUpdate(listener);

        return () => unsubscribePopoverUpdate(listener);
    });

    return activePopover;
}

export default function withVisibilityHandling(WrappedComponent: typeof Popover, popoverType: string) {
    return (props: PopoverProps): JSX.Element => {
        const [initialized, setInitialized] = useState<boolean>(false);
        const [visible, setVisible] = useState<boolean>(false);
        const currentActivePopover = useCurrentActivePopover();
        const { overlayClassName, ...rest } = props;
        const overlayClassNames = typeof overlayClassName === 'string' ? overlayClassName.split(/\s+/) : [];

        const popoverClassName = `cvat-${popoverType}-popover`;
        overlayClassNames.push(popoverClassName);
        if (visible) {
            const visiblePopoverClassName = `cvat-${popoverType}-popover-visible`;
            overlayClassNames.push(visiblePopoverClassName);
        }

        const callback = (event: Event): void => {
            if ((event as AnimationEvent).animationName === 'antZoomBigIn') {
                updateActivePopoverType(popoverType);
                setVisible(true);
            }
        };

        return (
            <WrappedComponent
                {...rest}
                trigger={visible && currentActivePopover === popoverType ? 'click' : 'hover'}
                overlayClassName={overlayClassNames.join(' ').trim()}
                onVisibleChange={(_visible: boolean) => {
                    if (!_visible) {
                        setVisible(false);
                    } else {
                        // Hide other popovers
                        const element = window.document.getElementsByClassName(`${popoverClassName}`)[0];
                        if (element) {
                            element.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
                        }
                    }
                    if (!initialized) {
                        const self = window.document.getElementsByClassName(`cvat-${popoverType}-popover`)[0];
                        self?.addEventListener('animationend', callback);
                        setInitialized(true);
                    }
                }}
            />
        );
    };
}
