// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';

import { useDroppable } from '@dnd-kit/core';

import { ObjectState } from 'cvat-core-wrapper';
import { isLayerState, layerDropID } from './index';
import DraggableObjectItem from './draggable-object-item';
import LayerHeader from './layer-header';

interface LayerSectionProps {
    zOrder: number;
    layerObjectIds: number[];
    objectStates: ObjectState[];
    visibleSkeletonElements: Record<number, number[]>;
    selected: boolean;
    visible: boolean;
    collapsed: boolean;
    selectLayer(zOrder: number): void;
    toggleLayerCollapsed(zOrder: number): void;
}

// Owns a complete layer block: drop target, header, and draggable object rows.
function LayerSection(props: LayerSectionProps): JSX.Element {
    const {
        zOrder, layerObjectIds, objectStates, visibleSkeletonElements,
        selected, visible, collapsed, selectLayer,
        toggleLayerCollapsed,
    } = props;

    const { isOver, setNodeRef } = useDroppable({ id: layerDropID(zOrder) });

    return (
        <div
            ref={setNodeRef}
            className={`cvat-objects-sidebar-z-layer${isOver ? ' cvat-objects-sidebar-z-layer-active' : ''}`}
            data-z-order={zOrder}
        >
            <LayerHeader
                zOrder={zOrder}
                selected={selected}
                visible={visible}
                collapsed={collapsed}
                selectLayer={selectLayer}
                toggleLayerCollapsed={toggleLayerCollapsed}
            />
            {!collapsed && layerObjectIds.map((id: number): JSX.Element => {
                const object = objectStates.find((state: ObjectState): boolean => state.clientID === id);

                return (
                    <DraggableObjectItem
                        key={id}
                        objectStates={objectStates}
                        clientID={id}
                        visibleSkeletonElements={visibleSkeletonElements}
                        draggable={!!object && isLayerState(object) && !object.lock}
                    />
                );
            })}
        </div>
    );
}

export default React.memo(LayerSection);
