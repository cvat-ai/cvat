// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React, { useState } from 'react';
import Popover, { PopoverProps } from 'antd/lib/popover';

export default function withVisibilityHandling(WrappedComponent: typeof Popover, popoverType: string) {
    return (props: PopoverProps): JSX.Element => {
        const [initialized, setInitialized] = useState<boolean>(false);
        const [visible, setVisible] = useState<boolean>(false);
        let { overlayClassName } = props;
        if (typeof overlayClassName !== 'string') overlayClassName = '';

        overlayClassName += ` cvat-${popoverType}-popover`;
        if (visible) {
            overlayClassName += ` cvat-${popoverType}-popover-visible`;
        }

        const callback = (event: Event): void => {
            if ((event as AnimationEvent).animationName === 'antZoomBigIn') {
                setVisible(true);
            }
        };

        return (
            <WrappedComponent
                {...props}
                overlayClassName={overlayClassName.trim()}
                onVisibleChange={(_visible: boolean) => {
                    if (!_visible) setVisible(false);
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
