// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { SmallDashOutlined } from '@ant-design/icons';
import Popover from 'antd/lib/popover';
import React, {
    FunctionComponent, useEffect, useRef, useState,
} from 'react';
import ReactDOM from 'react-dom';
import withVisibilityHandling from './handle-popover-visibility';

const extraControlsContentClassName = 'cvat-extra-controls-control-content';
const CustomPopover = withVisibilityHandling(Popover, 'extra-controls');

export const ContainerHeightContext = React.createContext(Number.MAX_SAFE_INTEGER);
export function ExtraControlsControl(): JSX.Element {
    const [hasChildren, setHasChildren] = useState(false);
    const [initialized, setInitialized] = useState(false);
    const [popoverOpen, setPopoverOpen] = useState(true);
    const [containerNode, setContainerNode] = React.useState<HTMLDivElement | null>(null);

    const containerRef = React.useCallback((node: HTMLDivElement | null) => {
        setContainerNode(node);
    }, []);

    useEffect(() => {
        if (!initialized) {
            setInitialized(true);
            setPopoverOpen(false);
        }

        const observer = new MutationObserver(() => {
            if (containerNode) {
                setHasChildren(containerNode.children.length > 0);
            }
        });

        if (containerNode) {
            observer.observe(containerNode, { childList: true });
            return () => observer.disconnect();
        }

        return () => {};
    }, [containerNode]);

    return (
        <CustomPopover
            open={popoverOpen}
            onOpenChange={setPopoverOpen}
            trigger={initialized ? 'hover' : 'click'} // trigger='hover' allows to close the popover by body click
            placement='right'
            overlayStyle={{ display: initialized ? '' : 'none' }}
            content={<div className={extraControlsContentClassName} ref={containerRef} />}
        >
            <SmallDashOutlined
                style={{ visibility: hasChildren ? 'visible' : 'hidden' }}
                className='cvat-extra-controls-control'
            />
        </CustomPopover>
    );
}

const renderedControls: Record<string, number> = Object.create(null);
export default function ControlVisibilityObserver<P extends {} = {}>(
    ControlComponent: FunctionComponent<P>,
    componentName: string,
): React.FunctionComponent<P> {
    return function (props: P): JSX.Element | null {
        const ref = useRef<HTMLDivElement>(null);
        const availableHeight = React.useContext(ContainerHeightContext);
        const [visible, setVisible] = useState(true);

        useEffect(() => {
            // on initial mount all will be rendered in side panel
            // so, we can calculate the position of the component
            // relatively the top of the side panel and save it in map
            if (ref.current) {
                const wrapper = ref.current;
                const wrapperBottom = wrapper.offsetTop + wrapper.offsetHeight;
                renderedControls[componentName] = wrapperBottom;

                return () => {
                    delete renderedControls[componentName];
                };
            }

            return () => {};
        }, []);

        useEffect(() => {
            let reservedHeight = 0;
            if (ref.current) {
                // we need to look at all controls to understand if we need to reserve some
                // space for extra controls or not. If we reserve always 45pixels for extra controls
                // we may get a useless wrap of control to the popover when there is enough space to render it as is
                const maximumBottom = Math.max(...Object.values(renderedControls), 0);
                reservedHeight = maximumBottom > availableHeight ? 45 : 0;
            }
            const wrapperBottom = renderedControls[componentName];
            const isVisible = wrapperBottom + reservedHeight <= availableHeight;
            setVisible(isVisible);
        }, [availableHeight]);

        if (!visible) {
            const extraControlsContent = window.document.getElementsByClassName(extraControlsContentClassName)[0];
            if (extraControlsContent) {
                return ReactDOM.createPortal(<ControlComponent {...props} />, extraControlsContent);
            }

            return null;
        }

        // first mount always to the side panel
        return (
            <div ref={ref}>
                <ControlComponent {...props} />
            </div>
        );
    };
}
