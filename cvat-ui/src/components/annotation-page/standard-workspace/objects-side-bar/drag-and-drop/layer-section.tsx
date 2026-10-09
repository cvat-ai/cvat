// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';

import { useDroppable } from '@dnd-kit/core';

import { layerDropID } from './index';
import LayerHeader from './layer-header';

interface LayerSectionProps {
    zOrder: number;
    selected: boolean;
    visible: boolean;
    collapsed: boolean;
    multiSelected: boolean;
    onMouseDown(event: React.MouseEvent): void;
    onKeyDown(event: React.KeyboardEvent): void;
    selectLayer(zOrder: number): void;
    toggleLayerVisibility(zOrder: number, includeLower: boolean): void;
    toggleLayerCollapsed(zOrder: number): void;
}

// The layer header remains a drop target when its object rows are virtualized separately.
function LayerSection(props: LayerSectionProps): JSX.Element {
    const {
        zOrder, selected, visible, collapsed, multiSelected, selectLayer, onMouseDown, onKeyDown,
        toggleLayerCollapsed, toggleLayerVisibility,
    } = props;

    const { isOver, setNodeRef } = useDroppable({ id: layerDropID(zOrder) });

    return (
        <div
            ref={setNodeRef}
            className={[
                'cvat-objects-sidebar-z-layer',
                'cvat-objects-sidebar-z-layer-virtual-header',
                ...(!collapsed ? ['cvat-objects-sidebar-z-layer-virtual-header-expanded'] : []),
                ...(isOver ? ['cvat-objects-sidebar-z-layer-active'] : []),
                ...(multiSelected ? ['cvat-objects-sidebar-z-layer-multi-selected'] : []),
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
            />
        </div>
    );
}

export default React.memo(LayerSection);
