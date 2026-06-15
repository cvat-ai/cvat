// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';

import { useDraggable } from '@dnd-kit/core';

import { ObjectState } from 'cvat-core-wrapper';
import ObjectItemContainer from 'containers/annotation-page/standard-workspace/objects-side-bar/object-item';
import { objectDragID } from './index';

interface Props {
    objectStates: ObjectState[];
    clientID: number;
    draggable: boolean;
    visibleSkeletonElements: Record<number, number[]>;
}

// Wraps an object item with dnd-kit drag behavior while preserving the original object item rendering.
function DraggableObjectItem(props: Props): JSX.Element {
    const {
        objectStates, clientID, draggable, visibleSkeletonElements,
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
            className={isDragging ? 'cvat-objects-sidebar-z-layer-dragging' : undefined}
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
