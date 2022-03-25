// Copyright (C) 2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React, { useEffect } from 'react';
import { useCallback } from 'react';
import { useRef } from 'react';
import { useLayoutEffect } from 'react';

export default function useDraggable(
    getPosition: () => number[],
    onDrag: (diffX: number, diffY: number) => void,
    component: JSX.Element,
): JSX.Element {
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const click = [0, 0];
        const position = getPosition();

        const mouseMoveListener = (event: MouseEvent): void => {
            const dy = event.clientY - click[0];
            const dx = event.clientX - click[1];
            onDrag(position[0] + dy, position[1] + dx);
            event.stopPropagation();
        };

        const mouseDownListener = (event: MouseEvent): void => {
            const [initialTop, initialLeft] = getPosition();
            position[0] = initialTop;
            position[1] = initialLeft;
            click[0] = event.clientY;
            click[1] = event.clientX;
            window.addEventListener('mousemove', mouseMoveListener);
            event.stopPropagation();
        };

        const mouseUpListener = (): void => {
            window.removeEventListener('mousemove', mouseMoveListener);
        };

        window.document.addEventListener('mouseup', mouseUpListener);
        if (ref.current) {
            ref.current.addEventListener('mousedown', mouseDownListener);
        }

        return () => {
            window.document.removeEventListener('mouseup', mouseUpListener);
            if (ref.current) {
                ref.current.removeEventListener('mousedown', mouseDownListener);
            }
        };
    }, []);

    return (
        <div ref={ref}>
            {component}
        </div>
    );
}
