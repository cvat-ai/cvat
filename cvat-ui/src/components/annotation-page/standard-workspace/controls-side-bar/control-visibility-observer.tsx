// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="resize-observer-browser" />

import { SmallDashOutlined } from '@ant-design/icons';
import Popover from 'antd/lib/popover';
import React, {
    useEffect, useLayoutEffect, useRef, useState,
} from 'react';
import ReactDOM from 'react-dom';

const extraControlsContentClassName = 'cvat-extra-controls-control-content';

let onUpdateChildren: Function | null = null;
export function ExtraControlsControl(): JSX.Element {
    const [hasChildren, setHasChildren] = useState(false);
    const [initialized, setInitialized] = useState(false);

    useEffect(() => {
        if (!initialized) {
            setInitialized(true);
        }

        window.document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    }, []);

    onUpdateChildren = () => {
        setHasChildren(window.document.getElementsByClassName(extraControlsContentClassName)[0].children.length > 0);
    };

    return (
        <Popover
            defaultVisible
            trigger={initialized ? 'hover' : 'click'}
            placement='right'
            overlayStyle={{ display: initialized ? '' : 'none' }}
            content={<div className={extraControlsContentClassName} />}
        >
            <SmallDashOutlined
                style={{ visibility: hasChildren ? 'visible' : 'hidden' }}
                className='cvat-extra-controls-control'
            />
        </Popover>
    );
}

export default function ControlVisibilityObserver<P = {}>(
    ControlComponent: React.FunctionComponent<P>,
): React.FunctionComponent<P> {
    let visibilityHeightThreshold = 0; // minimum value of height when element can be pushed to main panel

    return (props: P): JSX.Element | null => {
        const ref = useRef<HTMLDivElement>(null);
        const [visible, setVisible] = useState(true);

        useEffect(() => {
            if (ref && ref.current) {
                const wrapper = ref.current;
                const parentElement = ref.current.parentElement as HTMLElement;

                const reservedHeight = 60; // for itself
                const observer = new ResizeObserver(() => {
                    const availableHeight = parentElement.offsetHeight;
                    setVisible(availableHeight - reservedHeight >= visibilityHeightThreshold);
                });

                if (ref && ref.current) {
                    const availableHeight = parentElement.offsetHeight;
                    visibilityHeightThreshold = wrapper.offsetTop + wrapper.offsetHeight;
                    observer.observe(ref.current.parentElement as HTMLElement);
                    setVisible(availableHeight - reservedHeight >= visibilityHeightThreshold);
                }

                return () => {
                    observer.disconnect();
                };
            }

            return () => {};
        }, []);

        useLayoutEffect(() => {
            if (onUpdateChildren) {
                onUpdateChildren();
            }
        }, [visible]);

        if (!visible) {
            const extraControlsContent = window.document.getElementsByClassName(extraControlsContentClassName)[0];
            if (extraControlsContent) {
                return ReactDOM.createPortal(<ControlComponent {...props} />, extraControlsContent);
            }

            return null;
        }

        return (
            <div ref={ref}>
                <ControlComponent {...props} />
            </div>
        );
    };
}
