// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useCallback, useRef } from 'react';

import { useDroppable } from '@dnd-kit/core';

import {
    INSERT_DROP_AREA_PROXIMITY, layerInsertDropID, LayerPlacement, PointerPosition,
} from './index';

interface LayerInsertDropAreaProps {
    placement: LayerPlacement;
    pointerPosition: PointerPosition | null;
}

// Expands only when the pointer is close enough to make inserting a new layer intentional.
function LayerInsertDropArea(props: LayerInsertDropAreaProps): JSX.Element {
    const { placement, pointerPosition } = props;
    const { isOver, setNodeRef } = useDroppable({ id: layerInsertDropID(placement) });
    const dropAreaRef = useRef<HTMLDivElement | null>(null);

    const setDropAreaRef = useCallback((element: HTMLDivElement | null): void => {
        dropAreaRef.current = element;
        setNodeRef(element);
    }, [setNodeRef]);

    const pointerIsNear = ((): boolean => {
        if (!pointerPosition || !dropAreaRef.current) {
            return false;
        }

        const rect = dropAreaRef.current.getBoundingClientRect();
        return (
            pointerPosition.x >= rect.left &&
            pointerPosition.x <= rect.right &&
            pointerPosition.y >= rect.top - INSERT_DROP_AREA_PROXIMITY &&
            pointerPosition.y <= rect.bottom + INSERT_DROP_AREA_PROXIMITY
        );
    })();

    const expanded = isOver || pointerIsNear;
    const classList = [
        'cvat-objects-sidebar-z-layer-move-drop-area',
        ...(expanded ? ['cvat-objects-sidebar-z-layer-move-drop-area-active'] : []),
    ];

    return (
        <div
            ref={setDropAreaRef}
            className={`${classList.join(' ')}`}
        />
    );
}

export default React.memo(LayerInsertDropArea);
