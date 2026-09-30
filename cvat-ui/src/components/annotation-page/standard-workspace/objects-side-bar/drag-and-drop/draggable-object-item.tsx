// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useCallback } from 'react';

import { useDraggable, useDroppable } from '@dnd-kit/core';

import { ObjectState } from 'cvat-core-wrapper';
import ObjectItemContainer from 'containers/annotation-page/standard-workspace/objects-side-bar/object-item';
import { KeyMap } from 'utils/mousetrap-react';
import { isMultiSelectObjectModifierPressed } from 'utils/multi-selection';
import { layerObjectDropID, objectDragID } from './index';

interface Props {
    objectStates: ObjectState[];
    clientID: number;
    zOrder: number;
    lastInLayer: boolean;
    visibleObjectIDs: number[];
    draggable: boolean;
    visibleSkeletonElements: Record<number, number[]>;
    toggleSelection(): void;
    selectRange(): void;
    keyMap: KeyMap;
    multiSelectionSupported: boolean;
}

function isRangeModifierPressed(event: React.MouseEvent | React.PointerEvent): boolean {
    return event.shiftKey && !event.ctrlKey && !event.altKey && !event.metaKey;
}

// Wraps an object item with dnd-kit drag behavior while preserving the original object item rendering.
function DraggableObjectItem(props: Props): JSX.Element {
    const {
        objectStates, clientID, zOrder, lastInLayer, visibleObjectIDs, draggable, visibleSkeletonElements,
        toggleSelection, selectRange, keyMap, multiSelectionSupported,
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
            onPointerDown={(event: React.PointerEvent): void => {
                if (draggable && (!multiSelectionSupported ||
                    (!isRangeModifierPressed(event) && !isMultiSelectObjectModifierPressed(event, keyMap)))) {
                    listeners?.onPointerDown?.(event);
                }
            }}
            onMouseDownCapture={(event: React.MouseEvent): void => {
                if (!multiSelectionSupported) return;
                if (isRangeModifierPressed(event)) {
                    event.preventDefault();
                    event.stopPropagation();
                    selectRange();
                } else if (isMultiSelectObjectModifierPressed(event, keyMap)) {
                    event.preventDefault();
                    event.stopPropagation();
                    toggleSelection();
                }
            }}
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
                visibleObjectIDs={visibleObjectIDs}
                visibleSkeletonElements={visibleSkeletonElements}
                zLayerDragging={isDragging}
                zLayerDragProps={draggable ? {} : undefined}
            />
        </div>
    );
}

export default React.memo(DraggableObjectItem);
