// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';

import { useDraggable } from '@dnd-kit/core';

import { ObjectState } from 'cvat-core-wrapper';
import ObjectItemContainer from 'containers/annotation-page/standard-workspace/objects-side-bar/object-item';
import { KeyMap } from 'utils/mousetrap-react';
import { isMultiSelectObjectModifierPressed } from 'utils/multi-selection';
import { objectDragID } from './index';

interface Props {
    objectStates: ObjectState[];
    clientID: number;
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
        objectStates, clientID, visibleObjectIDs, draggable, visibleSkeletonElements,
        toggleSelection, selectRange, keyMap, multiSelectionSupported,
    } = props;

    const {
        attributes, listeners, setNodeRef, isDragging,
    } = useDraggable({
        id: objectDragID(clientID),
        disabled: !draggable,
    });

    const style = {
        ...(isDragging ? { pointerEvents: 'none' as const } : {}),
    };

    return (
        <div
            ref={setNodeRef}
            {...(draggable ? attributes : {})}
            {...(draggable ? listeners : {})}
            onPointerDown={(event: React.PointerEvent): void => {
                if (!multiSelectionSupported ||
                    (!isRangeModifierPressed(event) && !isMultiSelectObjectModifierPressed(event, keyMap))) {
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
            className={isDragging ? 'cvat-objects-sidebar-z-layer-dragging' : undefined}
            style={style}
        >
            <ObjectItemContainer
                objectStates={objectStates}
                clientID={clientID}
                visibleObjectIDs={visibleObjectIDs}
                visibleSkeletonElements={visibleSkeletonElements}
                allowSimplifyLifecycle
                zLayerDragging={isDragging}
                zLayerDragProps={draggable ? {} : undefined}
            />
        </div>
    );
}

export default React.memo(DraggableObjectItem);
