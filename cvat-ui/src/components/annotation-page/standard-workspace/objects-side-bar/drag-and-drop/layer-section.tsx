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
    visibleObjectIDs: number[];
    objectStates: ObjectState[];
    visibleSkeletonElements: Record<number, number[]>;
    selected: boolean;
    visible: boolean;
    collapsed: boolean;
    multiSelected: boolean;
    onMouseDown(event: React.MouseEvent): void;
    onKeyDown(event: React.KeyboardEvent): void;
    onContextMenu(event: React.MouseEvent): void;
    selectLayer(zOrder: number): void;
    toggleLayerVisibility(zOrder: number, includeLower: boolean): void;
    toggleLayerCollapsed(zOrder: number): void;
}

// Owns a complete layer block: drop target, header, and draggable object rows.
function LayerSection(props: LayerSectionProps): JSX.Element {
    const {
        zOrder, layerObjectIds, visibleObjectIDs, objectStates, visibleSkeletonElements,
        selected, visible, collapsed, multiSelected, selectLayer, onMouseDown, onKeyDown, onContextMenu,
        toggleLayerCollapsed, toggleLayerVisibility,
    } = props;

    const { isOver, setNodeRef } = useDroppable({ id: layerDropID(zOrder) });

    return (
        <div
            ref={setNodeRef}
            className={[
                'cvat-objects-sidebar-z-layer',
                isOver ? 'cvat-objects-sidebar-z-layer-active' : '',
                multiSelected ? 'cvat-objects-sidebar-z-layer-multi-selected' : '',
            ].join(' ')}
            data-z-order={zOrder}
        >
            <LayerHeader
                zOrder={zOrder}
                selected={selected}
                visible={visible}
                collapsed={collapsed}
                multiSelected={multiSelected}
                selectLayer={selectLayer}
                toggleLayerVisibility={toggleLayerVisibility}
                toggleLayerCollapsed={toggleLayerCollapsed}
                onMouseDown={onMouseDown}
                onKeyDown={onKeyDown}
                onContextMenu={onContextMenu}
            />
            {!collapsed && layerObjectIds.map((id: number): JSX.Element => {
                const object = objectStates.find((state: ObjectState): boolean => state.clientID === id);

                return (
                    <DraggableObjectItem
                        key={id}
                        objectStates={objectStates}
                        clientID={id}
                        visibleObjectIDs={visibleObjectIDs}
                        visibleSkeletonElements={visibleSkeletonElements}
                        draggable={!!object && isLayerState(object) && !object.lock}
                    />
                );
            })}
        </div>
    );
}

export default React.memo(LayerSection);
