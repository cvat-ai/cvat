// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useCallback } from 'react';

import { useDraggable, useDroppable } from '@dnd-kit/core';

import { ObjectState } from 'cvat-core-wrapper';
import ObjectItemContainer from 'containers/annotation-page/standard-workspace/objects-side-bar/object-item';
import { layerObjectDropID, objectDragID } from './index';

interface Props {
    objectStates: ObjectState[];
    clientID: number;
    zOrder: number;
    lastInLayer: boolean;
    draggable: boolean;
    visibleSkeletonElements: Record<number, number[]>;
}

// Wraps an object item with dnd-kit drag behavior while preserving the original object item rendering.
function DraggableObjectItem(props: Props): JSX.Element {
    const {
        objectStates, clientID, zOrder, lastInLayer, draggable, visibleSkeletonElements,
    } = props;

    const {
        attributes, listeners, setNodeRef: setDraggableNodeRef, isDragging,
    } = useDraggable({
        id: objectDragID(clientID),
        disabled: !draggable,
    });
    const { isOver, setNodeRef: setDroppableNodeRef } = useDroppable({
        id: layerObjectDropID(zOrder, clientID),
    });
    const setNodeRef = useCallback((element: HTMLDivElement | null): void => {
        setDraggableNodeRef(element);
        setDroppableNodeRef(element);
    }, [setDraggableNodeRef, setDroppableNodeRef]);

    const style = {
        ...(isDragging ? { pointerEvents: 'none' as const } : {}),
    };

    return (
        <div
            ref={setNodeRef}
            data-z-order={zOrder}
            {...(draggable ? attributes : {})}
            {...(draggable ? listeners : {})}
            className={[
                'cvat-objects-sidebar-z-layer-object-row',
                ...(lastInLayer ? ['cvat-objects-sidebar-z-layer-object-row-last'] : []),
                ...(isDragging ? ['cvat-objects-sidebar-z-layer-dragging'] : []),
                ...(isOver ? ['cvat-objects-sidebar-z-layer-active'] : []),
            ].join(' ')}
            style={style}
        >
            <ObjectItemContainer
                objectStates={objectStates}
                clientID={clientID}
                visibleSkeletonElements={visibleSkeletonElements}
                allowSimplifyLifecycle
                zLayerDragging={isDragging}
                zLayerDragProps={draggable ? {} : undefined}
            />
        </div>
    );
}

export default React.memo(DraggableObjectItem);
