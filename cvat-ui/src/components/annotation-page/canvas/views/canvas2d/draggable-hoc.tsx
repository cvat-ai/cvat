// Copyright (C) 2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useEffect, useRef } from 'react';

export default function useDraggable(
    getPosition: () => number[],
    onDrag: (diffX: number, diffY: number) => void,
    component: JSX.Element,
): JSX.Element {
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (!ref.current) return () => {};
        const click = [0, 0];
        const position = getPosition();

        const mouseMoveListener = (event: MouseEvent): void => {
            const dy = event.clientY - click[0];
            const dx = event.clientX - click[1];
            onDrag(position[0] + dy, position[1] + dx);
            event.stopPropagation();
            event.preventDefault();
        };

        const mouseDownListener = (event: MouseEvent): void => {
            const [initialTop, initialLeft] = getPosition();
            position[0] = initialTop;
            position[1] = initialLeft;
            click[0] = event.clientY;
            click[1] = event.clientX;
            window.addEventListener('mousemove', mouseMoveListener);
            event.stopPropagation();
            event.preventDefault();
        };

        const mouseUpListener = (): void => {
            window.removeEventListener('mousemove', mouseMoveListener);
        };

        window.document.addEventListener('mouseup', mouseUpListener);
        ref.current.addEventListener('mousedown', mouseDownListener);

        return () => {
            window.document.removeEventListener('mouseup', mouseUpListener);
            if (ref.current) {
                ref.current.removeEventListener('mousedown', mouseDownListener);
            }
        };
    }, [ref.current]);

    return (
        <div ref={ref}>
            {component}
        </div>
    );
}
